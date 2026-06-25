import Filing from "./filing.model.js";
import { compareRegimes, compareRegimesWithCapitalGains } from "../tax-engine/engine.service.js";
import { computeRefundStatus } from "./refund.service.js";
import { CURRENT_AY, DEDUCTION_LIMITS } from "@itr-app/shared-types";
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

// Decrypts whichever of itr1Data/itr2Data is present on a filing — only one
// will ever be set, since itrType determines which subdocument is in use.
const withDecryptedPII = (filing) => {
  if (!filing) return filing;
  const plain = filing.toObject ? filing.toObject() : filing;
  const result = { ...plain };
  if (result.itr1Data) result.itr1Data = decryptPII(result.itr1Data);
  if (result.itr2Data) result.itr2Data = decryptPII(result.itr2Data);
  return result;
};

// Gross salary is derived from the Form 16 Part B breakdown rather than entered
// directly — computed once here so every downstream consumer (XML generator,
// approval summary, dashboards) can keep reading itr1Data.grossSalary unchanged.
const computeGrossSalary = (incomeDetails) =>
  (incomeDetails.basicSalary      || 0) +
  (incomeDetails.hra_received     || 0) +
  (incomeDetails.specialAllowance || 0) +
  (incomeDetails.bonus            || 0);

// Splits house property figures into two pieces that must be fed into the tax
// engine differently:
//   - letOutNetIncome: rent minus municipal tax minus the flat 30% standard
//     deduction minus loan interest. Deductible identically in BOTH regimes
//     (Sec 24(b) interest on let-out property is not regime-restricted), so
//     this is safe to add directly into "otherIncome".
//   - selfOccupiedInterest: only deductible under the OLD regime (capped at
//     ₹2,00,000 combined per Sec 24(b)); disallowed entirely under the new
//     regime. This must NOT be blended into otherIncome (which the engine
//     treats identically for both regimes when comparing old vs new) — it's
//     passed through as deductions.homeLoanInterest instead, so the engine's
//     already-correct per-regime capping (computeOldRegimeDeductions caps at
//     200000; the new-regime branch zeroes all deductions) applies properly
//     and the old-vs-new comparison stays fair to both regimes.
const computeHousePropertyBreakdown = (houseProperties = []) => {
  let selfOccupiedInterest = 0;
  let letOutNetIncome = 0;

  for (const p of houseProperties) {
    if (p.type === "self_occupied") {
      selfOccupiedInterest += p.interestOnLoan || 0;
    } else {
      const nav = Math.max(0, (p.annualRent || 0) - (p.municipalTax || 0));
      const standardDeduction = nav * 0.30;
      letOutNetIncome += nav - standardDeduction - (p.interestOnLoan || 0);
    }
  }

  return { letOutNetIncome, selfOccupiedInterest };
};

// ── Service functions ──────────────────────────────────────────────────────

export const saveDraft = async (userId, { itrType, assessmentYear, step, data }) => {
  // caClientId: null is required here — without it, this could match (and silently
  // overwrite) a CA-prepared client filing, since client filings share the same
  // userId as the CA who prepared them (see resolveOwnerUserId in ca-firm.service.js).
  const filter = { userId, itrType, assessmentYear, caClientId: null };

  // itrType selects which subdocument the draft is stored under — itr1Data
  // for ITR-1, itr2Data for ITR-2.
  const dataField = itrType === "ITR-2" ? "itr2Data" : "itr1Data";

  const update = {
    $set: {
      status:        "draft",
      [dataField]:   encryptPII(data),
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

// ── ITR-2 ─────────────────────────────────────────────────────────────────────

export const submitITR2 = async (userId, { personalInfo, incomeDetails, houseProperties, capitalGains, deductions, selectedRegime }) => {
  // Recompute tax server-side — never trust client tax values
  const grossIncome = computeGrossSalary(incomeDetails);
  const { letOutNetIncome, selfOccupiedInterest } = computeHousePropertyBreakdown(houseProperties);
  const otherIncome = (incomeDetails.interestIncome || 0) + (incomeDetails.otherIncome || 0) + letOutNetIncome;

  const taxResult = compareRegimesWithCapitalGains({
    grossIncome,
    otherIncome,
    capitalGains,
    deductions: { ...deductions, hra: deductions.hra_exempt, homeLoanInterest: selfOccupiedInterest },
    dateOfBirth: personalInfo.dateOfBirth || null,
  });

  const selectedTax = taxResult[selectedRegime];

  const ackNo = `ITR2${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  // caClientId: null — see saveDraft() above for why this guard is required.
  const filter = {
    userId,
    itrType:        "ITR-2",
    assessmentYear: CURRENT_AY,
    caClientId:     null,
  };

  // Stored net income reflects the FINAL selected regime's self-occupied
  // interest cap (₹2,00,000 old / 0 new) — the comparison above used the
  // engine's own per-regime capping for both regimes simultaneously instead.
  const cappedSelfOccupiedInterest = selectedRegime === "old"
    ? Math.min(selfOccupiedInterest, 200000)
    : 0;
  const housePropertyNetIncome = letOutNetIncome - cappedSelfOccupiedInterest;

  const rawItr2Data = {
    ...personalInfo,
    ...incomeDetails,
    grossSalary: grossIncome,
    houseProperties,
    housePropertyNetIncome,
    capitalGains,
    ...deductions,
    selectedRegime,
    taxComputation: selectedTax,
  };

  const filing = await Filing.findOneAndUpdate(
    filter,
    {
      $set: {
        status:            "submitted",
        itr2Data:          encryptPII(rawItr2Data),
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
  return filings.map((f) => withDecryptedPII(f));
};

export const getFilingById = async (userId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, userId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });
  return withDecryptedPII(filing);
};

// ── CA Portal service functions ───────────────────────────────────────────────

export const saveDraftForClient = async (caId, clientId, { itrType, assessmentYear, step, data }, actingUserId = caId) => {
  const filter = { userId: caId, caClientId: clientId, itrType, assessmentYear };
  const dataField = itrType === "ITR-2" ? "itr2Data" : "itr1Data";
  const filing = await Filing.findOneAndUpdate(
    filter,
    { $set: { status: "draft", [dataField]: encryptPII(data), preparedByCa: actingUserId, caClientId: clientId } },
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

export const submitITR2ForClient = async (caId, clientId, { personalInfo, incomeDetails, houseProperties, capitalGains, deductions, selectedRegime }, actingUserId = caId) => {
  const grossIncome = computeGrossSalary(incomeDetails);
  const { letOutNetIncome, selfOccupiedInterest } = computeHousePropertyBreakdown(houseProperties);
  const otherIncome = (incomeDetails.interestIncome || 0) + (incomeDetails.otherIncome || 0) + letOutNetIncome;

  const taxResult = compareRegimesWithCapitalGains({
    grossIncome,
    otherIncome,
    capitalGains,
    deductions: { ...deductions, hra: deductions.hra_exempt, homeLoanInterest: selfOccupiedInterest },
    dateOfBirth: personalInfo.dateOfBirth || null,
  });

  const selectedTax = taxResult[selectedRegime];
  const ackNo = `ITR2CA${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const cappedSelfOccupiedInterest = selectedRegime === "old"
    ? Math.min(selfOccupiedInterest, 200000)
    : 0;
  const housePropertyNetIncome = letOutNetIncome - cappedSelfOccupiedInterest;

  const rawItr2Data = {
    ...personalInfo,
    ...incomeDetails,
    grossSalary: grossIncome,
    houseProperties,
    housePropertyNetIncome,
    capitalGains,
    ...deductions,
    selectedRegime,
    taxComputation: selectedTax,
  };

  const filing = await Filing.findOneAndUpdate(
    { userId: caId, caClientId: clientId, itrType: "ITR-2", assessmentYear: CURRENT_AY },
    {
      $set: {
        status:            "submitted",
        itr2Data:          encryptPII(rawItr2Data),
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
  return filings.map((f) => withDecryptedPII(f));
};

export const getClientFilingRefund = async (caId, clientId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, userId: caId, caClientId: clientId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });
  return computeRefundStatus(filing);
};
