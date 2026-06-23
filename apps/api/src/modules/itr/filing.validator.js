import { z } from "zod";
import { isValidAadhaarChecksum } from "@itr-app/shared-types";

export const saveDraftSchema = z.object({
  itrType:        z.literal("ITR-1").default("ITR-1"),
  assessmentYear: z.string().default("2026-27"),
  step:           z.number().min(0).max(3),
  data:           z.record(z.any()),
});

export const submitITR1Schema = z.object({
  selectedRegime: z.enum(["old", "new"]),
  personalInfo:   z.object({
    fullName:          z.string().min(1),
    pan:               z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
    dateOfBirth:       z.string().optional(),
    gender:            z.enum(["M","F","T"]),
    residentialStatus: z.string().default("ROR"),
    fatherName:        z.string().optional(),
    addressLine1:      z.string().optional(),
    city:              z.string(),
    pinCode:           z.string().regex(/^\d{6}$/).optional(),
    mobile:            z.string().regex(/^[6-9]\d{9}$/).optional(),
    aadhaar:           z.string().regex(/^\d{12}$/).refine(isValidAadhaarChecksum, {
      message: "Invalid Aadhaar number (checksum failed)",
    }).optional(),
    employerName:      z.string(),
    employerTAN:       z.string(),
    bankAccountNo:     z.string(),
    ifscCode:          z.string(),
  }),
  incomeDetails: z.object({
    // Salary breakdown matching Form 16 Part B — grossSalary is derived
    // server-side from these four fields, not accepted as direct input.
    basicSalary:      z.number().min(0),
    hra_received:     z.number().min(0).default(0),
    specialAllowance: z.number().min(0).default(0),
    bonus:            z.number().min(0).default(0),
    professionalTax:  z.number().min(0).default(0),
    tdsDeducted:      z.number().min(0),
    interestIncome:   z.number().min(0).default(0),
    otherIncome:      z.number().min(0).default(0),
  }),
  deductions: z.object({
    sec80C:           z.number().min(0).default(0),
    sec80CCD1B:       z.number().min(0).default(0),
    sec80D_self:      z.number().min(0).default(0),
    sec80D_parents:   z.number().min(0).default(0),
    homeLoanInterest: z.number().min(0).default(0),
    hra_exempt:       z.number().min(0).default(0),
    lta:              z.number().min(0).default(0),
    sec80TTA_TTB:     z.number().min(0).default(0),
    sec80G:           z.number().min(0).default(0),
  }),
});

// ── ITR-2 ─────────────────────────────────────────────────────────────────────

export const saveDraftItr2Schema = z.object({
  itrType:        z.literal("ITR-2").default("ITR-2"),
  assessmentYear: z.string().default("2026-27"),
  step:           z.number().min(0).max(4),
  data:           z.record(z.any()),
});

const housePropertySchema = z.object({
  type:           z.enum(["self_occupied", "let_out"]),
  address:        z.string().optional(),
  annualRent:     z.number().min(0).default(0),
  municipalTax:   z.number().min(0).default(0),
  interestOnLoan: z.number().min(0).default(0),
});

export const submitITR2Schema = z.object({
  selectedRegime: z.enum(["old", "new"]),
  personalInfo:   z.object({
    fullName:          z.string().min(1),
    pan:               z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
    dateOfBirth:       z.string().optional(),
    gender:            z.enum(["M","F","T"]),
    residentialStatus: z.string().default("ROR"),
    fatherName:        z.string().optional(),
    addressLine1:      z.string().optional(),
    city:              z.string(),
    pinCode:           z.string().regex(/^\d{6}$/).optional(),
    mobile:            z.string().regex(/^[6-9]\d{9}$/).optional(),
    aadhaar:           z.string().regex(/^\d{12}$/).refine(isValidAadhaarChecksum, {
      message: "Invalid Aadhaar number (checksum failed)",
    }).optional(),
    employerName:      z.string(),
    employerTAN:       z.string(),
    bankAccountNo:     z.string(),
    ifscCode:          z.string(),
  }),
  incomeDetails: z.object({
    basicSalary:      z.number().min(0),
    hra_received:     z.number().min(0).default(0),
    specialAllowance: z.number().min(0).default(0),
    bonus:            z.number().min(0).default(0),
    professionalTax:  z.number().min(0).default(0),
    tdsDeducted:      z.number().min(0),
    interestIncome:   z.number().min(0).default(0),
    otherIncome:      z.number().min(0).default(0),
  }),
  houseProperties: z.array(housePropertySchema).default([]),
  capitalGains: z.object({
    stcg111A: z.number().min(0).default(0),
    ltcg112A: z.number().min(0).default(0),
  }).default({}),
  // No homeLoanInterest field here, unlike ITR-1 — house property interest
  // (including self-occupied) is captured per-property in houseProperties[]
  // instead, so it isn't double-counted as a separate Chapter VI-A deduction.
  deductions: z.object({
    sec80C:           z.number().min(0).default(0),
    sec80CCD1B:       z.number().min(0).default(0),
    sec80D_self:      z.number().min(0).default(0),
    sec80D_parents:   z.number().min(0).default(0),
    hra_exempt:       z.number().min(0).default(0),
    lta:              z.number().min(0).default(0),
    sec80TTA_TTB:     z.number().min(0).default(0),
    sec80G:           z.number().min(0).default(0),
  }),
});
