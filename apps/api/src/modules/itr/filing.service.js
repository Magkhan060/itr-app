import Filing from "./filing.model.js";
import { compareRegimes } from "../tax-engine/engine.service.js";
import crypto from "crypto";

export const saveDraft = async (userId, { itrType, assessmentYear, step, data }) => {
  const filter = { userId, itrType, assessmentYear };

  // Flatten step data into itr1Data
  const update = {
    $set: {
      status: "draft",
      [`itr1Data`]: data,
    },
  };

  const filing = await Filing.findOneAndUpdate(filter, update, {
    new:    true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return filing;
};

export const submitITR1 = async (userId, { personalInfo, incomeDetails, deductions, selectedRegime }) => {
  // Recompute tax server-side — never trust client tax values
  const grossIncome = incomeDetails.basicSalary + incomeDetails.hra_received +
                      incomeDetails.specialAllowance + (incomeDetails.bonus || 0);
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

  // Generate acknowledgement number
  const ackNo = `ITR1${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const filter = {
    userId,
    itrType:        "ITR-1",
    assessmentYear: "2026-27",
  };

  const itr1Data = {
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
        itr1Data,
        submittedAt:       new Date(),
        acknowledgementNo: ackNo,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    filing,
    acknowledgementNo: ackNo,
    taxSummary:        selectedTax,
  };
};

export const getMyFilings = async (userId) => {
  return Filing.find({ userId }).sort({ createdAt: -1 }).lean();
};

export const getFilingById = async (userId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, userId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });
  return filing;
};
