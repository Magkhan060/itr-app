import { z } from "zod";

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
    city:              z.string(),
    employerName:      z.string(),
    employerTAN:       z.string(),
    bankAccountNo:     z.string(),
    ifscCode:          z.string(),
  }),
  incomeDetails: z.object({
    grossSalary:    z.number().min(0),
    hra_received:   z.number().min(0).default(0),
    tdsDeducted:    z.number().min(0),
    interestIncome: z.number().min(0).default(0),
    otherIncome:    z.number().min(0).default(0),
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
