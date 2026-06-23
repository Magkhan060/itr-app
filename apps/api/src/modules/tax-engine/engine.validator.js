import { z } from "zod";

const deductionsSchema = z.object({
  sec80C:           z.number().min(0).default(0),
  sec80CCD1B:       z.number().min(0).default(0),
  sec80D_self:      z.number().min(0).default(0),
  sec80D_parents:   z.number().min(0).default(0),
  sec80G:           z.number().min(0).default(0),
  sec80TTA_TTB:     z.number().min(0).default(0),
  homeLoanInterest: z.number().min(0).default(0),
  hra:              z.number().min(0).default(0),
  lta:              z.number().min(0).default(0),
  otherDeductions:  z.number().min(0).default(0),
}).default({});

export const computeTaxSchema = z.object({
  grossIncome:  z.number().min(0, "Gross income must be positive"),
  otherIncome:  z.number().min(0).default(0),
  deductions:   deductionsSchema,
  regime:       z.enum(["old", "new"]).default("new"),
  dateOfBirth:  z.string().optional().nullable(),
});

export const compareSchema = z.object({
  grossIncome:  z.number().min(0, "Gross income must be positive"),
  otherIncome:  z.number().min(0).default(0),
  deductions:   deductionsSchema,
  dateOfBirth:  z.string().optional().nullable(),
});

export const compareCGSchema = compareSchema.extend({
  capitalGains: z.object({
    stcg111A: z.number().min(0).default(0),
    ltcg112A: z.number().min(0).default(0),
  }).default({}),
});
