/**
 * Filing Validator — Zod schema tests
 * Pure validation — no mocks required.
 */

import { describe, it, expect } from "vitest";
import { saveDraftSchema, submitITR1Schema } from "./filing.validator.js";

// ─────────────────────────────────────────────────────────────────────────────
// Valid payload factories
// ─────────────────────────────────────────────────────────────────────────────

const validPersonalInfo = () => ({
  fullName:          "RAJESH KUMAR",
  pan:               "ABCDE1234F",
  dateOfBirth:       "1985-05-20",
  gender:            "M",
  residentialStatus: "ROR",
  city:              "Mumbai",
  employerName:      "Acme Pvt Ltd",
  employerTAN:       "MUMK12345E",
  bankAccountNo:     "123456789012",
  ifscCode:          "SBIN0001234",
});

const validIncomeDetails = () => ({
  basicSalary:      8_00_000,
  hra_received:     2_00_000,
  specialAllowance: 1_00_000,
  bonus:            0,
  tdsDeducted:      50_000,
  interestIncome:   0,
  otherIncome:      0,
});

const validDeductions = () => ({
  sec80C:           1_50_000,
  sec80CCD1B:       0,
  sec80D_self:      0,
  sec80D_parents:   0,
  homeLoanInterest: 0,
  hra_exempt:       0,
  lta:              0,
  sec80TTA_TTB:     0,
  sec80G:           0,
});

const validSubmitPayload = () => ({
  selectedRegime: "new",
  personalInfo:   validPersonalInfo(),
  incomeDetails:  validIncomeDetails(),
  deductions:     validDeductions(),
});

// ─────────────────────────────────────────────────────────────────────────────
// saveDraftSchema
// ─────────────────────────────────────────────────────────────────────────────

describe("saveDraftSchema", () => {
  it("accepts a valid draft payload", () => {
    const result = saveDraftSchema.safeParse({
      step: 0,
      data: { fullName: "RAJESH" },
    });
    expect(result.success).toBe(true);
  });

  it("defaults itrType to 'ITR-1' when omitted", () => {
    const result = saveDraftSchema.safeParse({ step: 1, data: {} });
    expect(result.success).toBe(true);
    expect(result.data?.itrType).toBe("ITR-1");
  });

  it("defaults assessmentYear to '2026-27' when omitted", () => {
    const result = saveDraftSchema.safeParse({ step: 0, data: {} });
    expect(result.data?.assessmentYear).toBe("2026-27");
  });

  it("rejects step < 0", () => {
    const result = saveDraftSchema.safeParse({ step: -1, data: {} });
    expect(result.success).toBe(false);
  });

  it("rejects step > 3", () => {
    const result = saveDraftSchema.safeParse({ step: 4, data: {} });
    expect(result.success).toBe(false);
  });

  it("accepts all valid step values (0, 1, 2, 3)", () => {
    for (const step of [0, 1, 2, 3]) {
      const result = saveDraftSchema.safeParse({ step, data: {} });
      expect(result.success).toBe(true);
    }
  });

  it("requires the 'data' field", () => {
    const result = saveDraftSchema.safeParse({ step: 0 });
    expect(result.success).toBe(false);
  });

  it("requires the 'step' field", () => {
    const result = saveDraftSchema.safeParse({ data: {} });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// submitITR1Schema — selectedRegime
// ─────────────────────────────────────────────────────────────────────────────

describe("submitITR1Schema — selectedRegime", () => {
  it("accepts 'old' regime", () => {
    const result = submitITR1Schema.safeParse({ ...validSubmitPayload(), selectedRegime: "old" });
    expect(result.success).toBe(true);
  });

  it("accepts 'new' regime", () => {
    const result = submitITR1Schema.safeParse({ ...validSubmitPayload(), selectedRegime: "new" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown regime values", () => {
    const result = submitITR1Schema.safeParse({ ...validSubmitPayload(), selectedRegime: "both" });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// submitITR1Schema — personalInfo
// ─────────────────────────────────────────────────────────────────────────────

describe("submitITR1Schema — personalInfo", () => {
  it("accepts a valid personalInfo block", () => {
    const result = submitITR1Schema.safeParse(validSubmitPayload());
    expect(result.success).toBe(true);
  });

  it("rejects PAN in lowercase", () => {
    const payload = validSubmitPayload();
    payload.personalInfo.pan = "abcde1234f";
    const result = submitITR1Schema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects PAN shorter than 10 characters", () => {
    const payload = validSubmitPayload();
    payload.personalInfo.pan = "ABCDE123";
    expect(submitITR1Schema.safeParse(payload).success).toBe(false);
  });

  it("rejects PAN with wrong structure (digits in wrong place)", () => {
    const payload = validSubmitPayload();
    payload.personalInfo.pan = "1234A5678F";
    expect(submitITR1Schema.safeParse(payload).success).toBe(false);
  });

  it("rejects gender values other than M/F/T", () => {
    const payload = validSubmitPayload();
    payload.personalInfo.gender = "X";
    expect(submitITR1Schema.safeParse(payload).success).toBe(false);
  });

  it("accepts all valid gender values (M, F, T)", () => {
    for (const gender of ["M", "F", "T"]) {
      const payload = validSubmitPayload();
      payload.personalInfo.gender = gender;
      expect(submitITR1Schema.safeParse(payload).success).toBe(true);
    }
  });

  it("rejects empty fullName", () => {
    const payload = validSubmitPayload();
    payload.personalInfo.fullName = "";
    expect(submitITR1Schema.safeParse(payload).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// submitITR1Schema — incomeDetails
// ─────────────────────────────────────────────────────────────────────────────

describe("submitITR1Schema — incomeDetails", () => {
  it("rejects negative basicSalary", () => {
    const payload = validSubmitPayload();
    payload.incomeDetails.basicSalary = -1;
    expect(submitITR1Schema.safeParse(payload).success).toBe(false);
  });

  it("accepts zero basicSalary", () => {
    const payload = validSubmitPayload();
    payload.incomeDetails.basicSalary = 0;
    expect(submitITR1Schema.safeParse(payload).success).toBe(true);
  });

  it("rejects negative tdsDeducted", () => {
    const payload = validSubmitPayload();
    payload.incomeDetails.tdsDeducted = -100;
    expect(submitITR1Schema.safeParse(payload).success).toBe(false);
  });

  it("defaults bonus to 0 when not supplied", () => {
    const payload = validSubmitPayload();
    delete payload.incomeDetails.bonus;
    const result = submitITR1Schema.safeParse(payload);
    expect(result.success).toBe(true);
    expect(result.data?.incomeDetails.bonus).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// submitITR1Schema — deductions
// ─────────────────────────────────────────────────────────────────────────────

describe("submitITR1Schema — deductions", () => {
  it("rejects negative sec80C", () => {
    const payload = validSubmitPayload();
    payload.deductions.sec80C = -1;
    expect(submitITR1Schema.safeParse(payload).success).toBe(false);
  });

  it("defaults all deduction fields to 0 when not provided", () => {
    const payload = {
      selectedRegime: "new",
      personalInfo:   validPersonalInfo(),
      incomeDetails:  validIncomeDetails(),
      deductions:     {},
    };
    const result = submitITR1Schema.safeParse(payload);
    expect(result.success).toBe(true);
    expect(result.data?.deductions.sec80C).toBe(0);
    expect(result.data?.deductions.sec80G).toBe(0);
  });
});
