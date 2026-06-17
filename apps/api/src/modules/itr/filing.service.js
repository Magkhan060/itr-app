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

// ── Service functions ──────────────────────────────────────────────────────

export const saveDraft = async (userId, { itrType, assessmentYear, step, data }) => {
  const filter = { userId, itrType, assessmentYear };

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
  const grossIncome = incomeDetails.grossSalary || 0;
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

  const filter = {
    userId,
    itrType:        "ITR-1",
    assessmentYear: CURRENT_AY,
  };

  const rawItr1Data = {
    ...personalInfo,
    ...incomeDetails,
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
  const filings = await Filing.find({ userId }).sort({ createdAt: -1 }).lean();
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
  const grossIncome = incomeDetails.grossSalary || 0;
  const otherIncome = (incomeDetails.interestIncome || 0) + (incomeDetails.otherIncome || 0);

  const taxResult   = compareRegimes({
    grossIncome, otherIncome,
    deductions: { ...deductions, hra: deductions.hra_exempt },
    dateOfBirth: personalInfo.dateOfBirth || null,
  });
  const selectedTax = taxResult[selectedRegime];
  const ackNo       = `ITR1CA${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const rawItr1Data = { ...personalInfo, ...incomeDetails, ...deductions, selectedRegime, taxComputation: selectedTax };

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
