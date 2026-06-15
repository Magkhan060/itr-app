/**
 * Advance Tax Service — unit tests
 * Verifies installment schedule computation, applicability threshold, and TDS offset.
 */

import { describe, it, expect } from "vitest";
import { computeAdvanceTax, ADVANCE_TAX_SCHEDULE } from "./advance-tax.service.js";

describe("computeAdvanceTax", () => {
  it("is NOT applicable when net tax due ≤ ₹10,000", () => {
    // income 12,75,000 new regime → totalTax = 0 after rebate
    const r = computeAdvanceTax({ grossIncome: 12_75_000, regime: "new" });
    expect(r.applicable).toBe(false);
    expect(r.netTaxDue).toBe(0);
  });

  it("is NOT applicable when TDS fully covers liability", () => {
    const r = computeAdvanceTax({
      grossIncome: 10_00_000,
      regime:      "old",
      tdsDeducted: 1_06_600, // exact liability (grossIncome 10L old regime)
    });
    expect(r.netTaxDue).toBe(0);
    expect(r.applicable).toBe(false);
  });

  it("is NOT applicable when net tax due is exactly ₹10,000 (strictly-greater-than rule)", () => {
    // Adjust TDS so netTaxDue = exactly 10,000
    const base = computeAdvanceTax({ grossIncome: 10_00_000, regime: "old", tdsDeducted: 0 });
    const tdsToLeave10K = base.totalTaxLiability - 10_000;
    const r = computeAdvanceTax({ grossIncome: 10_00_000, regime: "old", tdsDeducted: tdsToLeave10K });
    expect(r.netTaxDue).toBe(10_000);
    expect(r.applicable).toBe(false);
  });

  it("IS applicable when net tax due is ₹10,001", () => {
    const base = computeAdvanceTax({ grossIncome: 10_00_000, regime: "old", tdsDeducted: 0 });
    const tdsToLeave10001 = base.totalTaxLiability - 10_001;
    const r = computeAdvanceTax({ grossIncome: 10_00_000, regime: "old", tdsDeducted: tdsToLeave10001 });
    expect(r.netTaxDue).toBe(10_001);
    expect(r.applicable).toBe(true);
  });

  it("computes four installments summing to netTaxDue", () => {
    const r = computeAdvanceTax({ grossIncome: 20_00_000, regime: "new", tdsDeducted: 0 });
    expect(r.installments).toHaveLength(4);
    const sum = r.installments.reduce((acc, i) => acc + i.installmentAmount, 0);
    expect(sum).toBe(r.netTaxDue);
  });

  it("installments follow cumulative percentages: 15, 45, 75, 100", () => {
    const r = computeAdvanceTax({ grossIncome: 20_00_000, regime: "new", tdsDeducted: 0 });
    const pcts = r.installments.map((i) => i.cumulativePercent);
    expect(pcts).toEqual([15, 45, 75, 100]);
  });

  it("Q1 installment is 15% of net tax due", () => {
    const r = computeAdvanceTax({ grossIncome: 20_00_000, regime: "new", tdsDeducted: 0 });
    const expected = Math.round((r.netTaxDue * 15) / 100);
    expect(r.installments[0].installmentAmount).toBe(expected);
  });

  it("Q4 installment is the final balance (100% cumulative minus 75%)", () => {
    const r = computeAdvanceTax({ grossIncome: 20_00_000, regime: "new", tdsDeducted: 0 });
    const cum3 = Math.round((r.netTaxDue * 75) / 100);
    const expected = r.netTaxDue - cum3;
    expect(r.installments[3].installmentAmount).toBe(expected);
  });

  it("offsets TDS deducted from total liability", () => {
    const tds = 50_000;
    const r   = computeAdvanceTax({ grossIncome: 20_00_000, regime: "new", tdsDeducted: tds });
    expect(r.tdsDeducted).toBe(tds);
    expect(r.netTaxDue).toBe(r.totalTaxLiability - tds);
  });

  it("exposes correct taxBreakdown from the underlying computeTax result", () => {
    const r = computeAdvanceTax({ grossIncome: 20_00_000, regime: "new" });
    expect(r.taxBreakdown).toHaveProperty("regime", "new");
    expect(r.taxBreakdown.totalTax).toBe(r.totalTaxLiability);
  });

  it("installment due dates match the FY 2025-26 schedule", () => {
    const r = computeAdvanceTax({ grossIncome: 20_00_000, regime: "new" });
    expect(r.installments[0].dueDate).toBe("2025-06-15");
    expect(r.installments[1].dueDate).toBe("2025-09-15");
    expect(r.installments[2].dueDate).toBe("2025-12-15");
    expect(r.installments[3].dueDate).toBe("2026-03-15");
  });

  it("ADVANCE_TAX_SCHEDULE has exactly 4 quarters", () => {
    expect(ADVANCE_TAX_SCHEDULE).toHaveLength(4);
  });
});
