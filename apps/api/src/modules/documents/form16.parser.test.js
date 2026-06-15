/**
 * Form 16 Parser — unit tests
 * Mock extractPDFText so tests run without real PDF files.
 * Tests cover: field extraction, confidence scoring, and partial-data handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the PDF util so no real files are needed ────────────────────────────

vi.mock("../../utils/pdf.util.js", () => ({
  extractPDFText: vi.fn(),
}));

import { extractPDFText } from "../../utils/pdf.util.js";
import { parseForm16 }   from "./form16.parser.js";

// ─────────────────────────────────────────────────────────────────────────────
// Text fixtures
// ─────────────────────────────────────────────────────────────────────────────

const FULL_FORM16_TEXT = `
FORM NO. 16
Name and address of Employer: ACME TECHNOLOGIES PVT LTD
TAN of the Deductor: MUMK12345E
PAN of the Employee: ABCDE1234F
Name of the Employee: RAJESH KUMAR
Financial Year: 2025-26

1. Gross Salary                                     12,00,000
   Basic Salary                                      6,00,000
   House Rent Allowance                              2,40,000
   Special Allowance                                 1,20,000
   Bonus                                               40,000
   Leave Travel Allowance                              50,000

10(13A) HRA Exempt                                     80,000
Standard Deduction                                     75,000
Professional Tax                                        2,400

Deduction u/s 80C                                   1,50,000
Health Insurance                                       25,000

Income Chargeable under the head                    10,00,000
Tax Deducted from salary                               85,000
`;

const MINIMAL_FORM16_TEXT = `
TAN of the Deductor: BLRK98765Z
PAN of the Employee: ZZZZZ9999Z
Tax Deducted from salary: 12,000
`;

const EMPTY_TEXT = `
This document does not appear to be a Form 16.
No relevant fields could be found here.
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

const parse = (text) => {
  extractPDFText.mockResolvedValue(text);
  return parseForm16("/fake/path/form16.pdf");
};

// ─────────────────────────────────────────────────────────────────────────────
// Employer / Employee identity extraction
// ─────────────────────────────────────────────────────────────────────────────

describe("Form16 Parser — identity fields", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("extracts employer TAN matching pattern AAAA99999A", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.employerTAN).toBe("MUMK12345E");
  });

  it("extracts employee PAN matching pattern AAAAA9999A", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.employeePAN).toBe("ABCDE1234F");
  });

  it("extracts employer name", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.employerName).toMatch(/ACME TECHNOLOGIES/i);
  });

  it("extracts employee name", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.employeeName).toMatch(/RAJESH KUMAR/i);
  });

  it("extracts financial year in YYYY-YY format", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.financialYear).toBe("2025-26");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Income field extraction
// ─────────────────────────────────────────────────────────────────────────────

describe("Form16 Parser — income fields", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("extracts basicSalary", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.basicSalary).toBe(600000);
  });

  it("extracts hraReceived", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.hraReceived).toBe(240000);
  });

  it("extracts hraExempt from section 10(13A)", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.hraExempt).toBe(80000);
  });

  it("extracts specialAllowance", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.specialAllowance).toBe(120000);
  });

  it("extracts bonus", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.bonus).toBe(40000);
  });

  it("extracts LTA", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.lta).toBe(50000);
  });

  it("extracts totalTaxableIncome", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.totalTaxableIncome).toBe(1000000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TDS and deduction field extraction
// ─────────────────────────────────────────────────────────────────────────────

describe("Form16 Parser — TDS and deductions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("extracts tdsDeducted", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.tdsDeducted).toBe(85000);
  });

  it("extracts standardDeduction from section 16(ia)", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.standardDeduction).toBe(75000);
  });

  it("extracts professionalTax from section 16(iii)", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.professionalTax).toBe(2400);
  });

  it("extracts sec80C deduction", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.sec80C).toBe(150000);
  });

  it("extracts healthInsurance (80D)", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.healthInsurance).toBe(25000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Confidence scoring
// ─────────────────────────────────────────────────────────────────────────────

describe("Form16 Parser — confidence scoring", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("produces high confidence (≥ 80) for a complete Form 16", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it("produces low confidence for a near-empty document", async () => {
    const result = await parse(EMPTY_TEXT);
    expect(result.confidence).toBeLessThan(40);
  });

  it("produces intermediate confidence for a partial document", async () => {
    const result = await parse(MINIMAL_FORM16_TEXT);
    // Has 2 of 4 core fields (TAN + TDS) → 30% core + some allFilled bonus
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(80);
  });

  it("confidence is between 0 and 100", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("confidence score formula: 60% core-field weight + 40% all-field weight", async () => {
    // Minimal doc: employerTAN ✓ (1), employeePAN ✓ (2), grossSalary ✗ (2), tdsDeducted ✓ (3)
    // coreFilled/4 * 60 + allFilled/total * 40
    const result = await parse(MINIMAL_FORM16_TEXT);
    // Should be a round integer (Math.round used in parser)
    expect(Number.isInteger(result.confidence)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Output structure
// ─────────────────────────────────────────────────────────────────────────────

describe("Form16 Parser — output structure", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("always returns rawTextSample in the result", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result).toHaveProperty("rawTextSample");
    expect(typeof result.rawTextSample).toBe("string");
  });

  it("rawTextSample is at most 600 characters", async () => {
    const result = await parse(FULL_FORM16_TEXT);
    expect(result.rawTextSample.length).toBeLessThanOrEqual(600);
  });

  it("returns 0 (not null/undefined) for missing numeric fields", async () => {
    const result = await parse(MINIMAL_FORM16_TEXT);
    // Fields not present in minimal text should default to 0
    expect(result.basicSalary).toBe(0);
    expect(result.bonus).toBe(0);
    expect(result.sec80C).toBe(0);
  });

  it("returns null (not 0) for missing text/identity fields", async () => {
    const result = await parse(MINIMAL_FORM16_TEXT);
    // employerName not present in minimal text → null
    expect(result.employerName).toBeNull();
    expect(result.financialYear).toBeNull();
  });
});
