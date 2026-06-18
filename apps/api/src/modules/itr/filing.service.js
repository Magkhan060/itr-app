import Filing from "./filing.model.js";
import { compareRegimes } from "../tax-engine/engine.service.js";
import { CURRENT_AY } from "@itr-app/shared-types";
import { encrypt, decrypt } from "../../utils/encryption.js";
import crypto from "crypto";

// ── Encryption helpers for PII fields (bank account + Aadhaar) ────────────

const encryptPII = (itr1Data) => {
  if (!itr1Data) return itr1Data;
  const result = { ...itr1Data };
  if (result.bankAccountNo) {
    result.bankAccountEncrypted = encrypt(result.bankAccountNo);
    delete result.bankAccountNo;
  }
  if (result.aadhaar) {
    result.aadhaarEncrypted = encrypt(result.aadhaar);
    delete result.aadhaar;
  }
  return result;
};

const decryptPII = (itr1Data) => {
  if (!itr1Data) return itr1Data;
  const result = { ...itr1Data };
  if (result.bankAccountEncrypted) {
    result.bankAccountNo = decrypt(result.bankAccountEncrypted);
    delete result.bankAccountEncrypted;
  }
  if (result.aadhaarEncrypted) {
    result.aadhaar = decrypt(result.aadhaarEncrypted);
    delete result.aadhaarEncrypted;
  }
  return result;
};

const withDecryptedPII = (filing) => {
  if (!filing) return filing;
  const plain = filing.toObject ? filing.toObject() : filing;
  return { ...plain, itr1Data: decryptPII(plain.itr1Data) };
};

// Gross salary is derived from the Form 16 Part B breakdown rather than entered
// directly — computed once here so every downstream consumer (XML generator,
// approval summary, dashboards) can keep reading itr1Data.grossSalary unchanged.
const computeGrossSalary = (incomeDetails) =>
  (incomeDetails.basicSalary      || 0) +
  (incomeDetails.hra_received     || 0) +
  (incomeDetails.specialAllowance || 0) +
  (incomeDetails.bonus            || 0);

// ── Service functions ──────────────────────────────────────────────────────

export const saveDraft = async (userId, { itrType, assessmentYear, step, data }) => {
  // caClientId: null is required here — without it, this could match (and silently
  // overwrite) a CA-prepared client filing, since client filings share the same
  // userId as the CA who prepared them (see resolveOwnerUserId in ca-firm.service.js).
  const filter = { userId, itrType, assessmentYear, caClientId: null };

  const update = {
    $set: {
      status:   "draft",
      itr1Data: encryptPII(data),
    },
  };

  const filing = await Filing.findOneAndUpdate(filter, update, {
    new:    true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return withDecryptedPII(filing);
};

export const submitITR1 = async (userId, { personalInfo, incomeDetails, deductions, selectedRegime }) => {
  // Recompute tax server-side — never trust client tax values
  const grossIncome = computeGrossSalary(incomeDetails);
  const otherIncome = (incomeDetails.interestIncome || 0) + (incomeDetails.otherIncome || 0);

  const taxResult = compareRegimes({
    grossIncome,
    otherIncome,
    deductions: {
      ...deductions,
      hra: deductions.hra_exempt,
    },
    dateOfBirth: personalInfo.dateOfBirth || null,
  });

  const selectedTax = taxResult[selectedRegime];

  const ackNo = `ITR1${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  // caClientId: null — see saveDraft() above for why this guard is required.
  const filter = {
    userId,
    itrType:        "ITR-1",
    assessmentYear: CURRENT_AY,
    caClientId:     null,
  };

  const rawItr1Data = {
    ...personalInfo,
    ...incomeDetails,
    grossSalary: grossIncome,
    ...deductions,
    selectedRegime,
    taxComputation: selectedTax,
  };

  const filing = await Filing.findOneAndUpdate(
    filter,
    {
      $set: {
        status:            "submitted",
        itr1Data:          encryptPII(rawItr1Data),
        submittedAt:       new Date(),
        acknowledgementNo: ackNo,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    filing:            withDecryptedPII(filing),
    acknowledgementNo: ackNo,
    taxSummary:        selectedTax,
  };
};

export const getMyFilings = async (userId) => {
  // caClientId: null excludes filings the user prepared as a CA for their clients —
  // "my filings" means personal self-filed returns only.
  const filings = await Filing.find({ userId, caClientId: null }).sort({ createdAt: -1 }).lean();
  return filings.map((f) => ({ ...f, itr1Data: decryptPII(f.itr1Data) }));
};

export const getFilingById = async (userId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, userId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });
  return withDecryptedPII(filing);
};

// ── CA Portal service functions ───────────────────────────────────────────────

export const saveDraftForClient = async (caId, clientId, { itrType, assessmentYear, step, data }, actingUserId = caId) => {
  const filter = { userId: caId, caClientId: clientId, itrType, assessmentYear };
  const filing = await Filing.findOneAndUpdate(
    filter,
    { $set: { status: "draft", itr1Data: encryptPII(data), preparedByCa: actingUserId, caClientId: clientId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return withDecryptedPII(filing);
};

export const submitITR1ForClient = async (caId, clientId, { personalInfo, incomeDetails, deductions, selectedRegime }, actingUserId = caId) => {
  const grossIncome = computeGrossSalary(incomeDetails);
  const otherIncome = (incomeDetails.interestIncome || 0) + (incomeDetails.otherIncome || 0);

  const taxResult   = compareRegimes({
    grossIncome, otherIncome,
    deductions: { ...deductions, hra: deductions.hra_exempt },
    dateOfBirth: personalInfo.dateOfBirth || null,
  });
  const selectedTax = taxResult[selectedRegime];
  const ackNo       = `ITR1CA${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const rawItr1Data = { ...personalInfo, ...incomeDetails, grossSalary: grossIncome, ...deductions, selectedRegime, taxComputation: selectedTax };

  const filing = await Filing.findOneAndUpdate(
    { userId: caId, caClientId: clientId, itrType: "ITR-1", assessmentYear: CURRENT_AY },
    {
      $set: {
        status:            "submitted",
        itr1Data:          encryptPII(rawItr1Data),
        submittedAt:       new Date(),
        acknowledgementNo: ackNo,
        preparedByCa:      actingUserId,
        caClientId:        clientId,
        approvalStatus:    "not_sent",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return { filing: withDecryptedPII(filing), acknowledgementNo: ackNo, taxSummary: selectedTax };
};

export const getClientFilings = async (caId, clientId) => {
  const filings = await Filing.find({ userId: caId, caClientId: clientId }).sort({ createdAt: -1 }).lean();
  return filings.map((f) => ({ ...f, itr1Data: decryptPII(f.itr1Data) }));
};
