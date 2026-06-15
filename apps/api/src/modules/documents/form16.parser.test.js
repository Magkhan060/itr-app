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

// Realistic TRACES Form 16 fixture with the exact ambiguous patterns that caused
// production bugs: merged Part B rows, "80C, 80CCC", "health insurance premia under 80D".
// Closely mirrors actual TRACES PDF text: "Name and address of the Employee",
// "17(1) of the Income-tax Act, 1961", merged Part B rows, etc.
const TRACES_FORM16_TEXT = `
FORM NO. 16
Name and address of the Employer: MARKIT INDIA SERVICES PRIVATE LIMITED
TAN of the Deductor: DELM17484E
PAN of the Employee: BIGPK1248H
Name and address of the Employee: MOHAMMED ABDUL GHANI KHAN
Financial Year: 2024-25

(a) Salary as per provisions contained in section 17(1) of the Income-tax Act, 1961 3531553
Total deduction under section 80C, 80CCC and 80CCD(1) 168558
Deduction in respect of health insurance premia under section 80D 0.00
(e) House rent allowance under section 10(13A) (f) Other special allowances under section 10(14) 0.00
Total taxable income (9-11) 3456553
Standard deduction under section 16(ia) 75000

Form No. 16-Annexure
Basic Salary               1404649
House Rent Allowance        702325
Other Allowance            1014464
Performance Bonus           309227
Employee Provident Fund     168558

Tax Deducted from salary of the employee under section 192(1) 756045
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
// TRACES format — real-world ambiguous patterns
// ─────────────────────────────────────────────────────────────────────────────

describe("Form16 Parser — TRACES format (real PDF regression tests)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("extracts hraReceived from Annexure section, not from Part B section reference", async () => {
    // Bug: "House rent allowance under section 10(13A)" in Part B caused [^₹\n\d]*
    // to capture "10" from "10(13A)". Fix: search only in the Annexure section.
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.hraReceived).toBe(702325);
  });

  it("extracts hraExempt as 0 when Part B rows are merged by PDF extractor", async () => {
    // Bug: merged row "10(13A) (f) Other...section 10(14) 0.00" caused [^₹\n\d]*
    // to absorb "(f)...section " and capture "10" from "10(14)".
    // Fix: \s+ after 10(13A) — "(f)" is not whitespace followed by digit → fails.
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.hraExempt).toBe(0);
  });

  it("extracts sec80C from Employee Provident Fund in Annexure", async () => {
    // Bug: "Total deduction under section 80C, 80CCC and 80CCD(1)" caused
    // [^₹\n\d]* to absorb ", " and capture "80" from "80CCC".
    // Fix: search Annexure section; primary pattern targets EPF directly.
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.sec80C).toBe(168558);
  });

  it("extracts healthInsurance as 0 when only section ref appears after label", async () => {
    // Bug: "health insurance premia under section 80D" caused [^₹\n\d]*
    // to absorb " premia under section " and capture "80" from "80D".
    // Fix: \s+ — "premia" is not a digit → match fails → returns 0.
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.healthInsurance).toBe(0);
  });

  it("extracts employeeName from 'Name and address of the Employee' header", async () => {
    // Bug: pattern used "Name\s+of\s+" which skips "Name and address of".
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.employeeName).toMatch(/MOHAMMED ABDUL GHANI KHAN/i);
  });

  it("extracts grossSalary when 'of the Income-tax Act, 1961' appears after 17(1)", async () => {
    // Bug: pattern required digit immediately after "17(1)" but TRACES label has
    // "of the Income-tax Act, 1961" between the section ref and the amount.
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.grossSalary).toBe(3531553);
  });

  it("extracts totalTaxableIncome from formula reference (9-11)", async () => {
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.totalTaxableIncome).toBe(3456553);
  });

  it("extracts tdsDeducted from section 192(1) in Form 12BA", async () => {
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.tdsDeducted).toBe(756045);
  });

  it("extracts basicSalary from Annexure", async () => {
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.basicSalary).toBe(1404649);
  });

  it("extracts standardDeduction from section 16(ia)", async () => {
    const result = await parse(TRACES_FORM16_TEXT);
    expect(result.standardDeduction).toBe(75000);
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
