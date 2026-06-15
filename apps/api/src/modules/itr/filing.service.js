import Filing from "./filing.model.js";
import { compareRegimes } from "../tax-engine/engine.service.js";
import { CURRENT_AY } from "@itr-app/shared-types";
import { encrypt, decrypt } from "../../utils/encryption.js";
import crypto from "crypto";

// ── Encryption helpers for the itr1Data bank account field ────────────────

const encryptBankAccount = (itr1Data) => {
  if (!itr1Data?.bankAccountNo) return itr1Data;
  const { bankAccountNo, ...rest } = itr1Data;
  return { ...rest, bankAccountEncrypted: encrypt(bankAccountNo) };
};

const decryptBankAccount = (itr1Data) => {
  if (!itr1Data?.bankAccountEncrypted) return itr1Data;
  const { bankAccountEncrypted, ...rest } = itr1Data;
  return { ...rest, bankAccountNo: decrypt(bankAccountEncrypted) };
};

const withDecryptedBank = (filing) => {
  if (!filing) return filing;
  const plain = filing.toObject ? filing.toObject() : filing;
  return { ...plain, itr1Data: decryptBankAccount(plain.itr1Data) };
};

// ── Service functions ──────────────────────────────────────────────────────

export const saveDraft = async (userId, { itrType, assessmentYear, step, data }) => {
  const filter = { userId, itrType, assessmentYear };

  const update = {
    $set: {
      status:   "draft",
      itr1Data: encryptBankAccount(data),
    },
  };

  const filing = await Filing.findOneAndUpdate(filter, update, {
    new:    true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return withDecryptedBank(filing);
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
        itr1Data:          encryptBankAccount(rawItr1Data),
        submittedAt:       new Date(),
        acknowledgementNo: ackNo,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    filing:            withDecryptedBank(filing),
    acknowledgementNo: ackNo,
    taxSummary:        selectedTax,
  };
};

export const getMyFilings = async (userId) => {
  const filings = await Filing.find({ userId }).sort({ createdAt: -1 }).lean();
  return filings.map((f) => ({ ...f, itr1Data: decryptBankAccount(f.itr1Data) }));
};

export const getFilingById = async (userId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, userId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });
  return withDecryptedBank(filing);
};
