/**
 * Tax Engine — unit tests
 * All monetary values in INR. Expected values hand-computed from FY 2025-26 slabs.
 * No mocks needed — the engine is pure computation with no I/O.
 */

import { describe, it, expect } from "vitest";
import {
  computeTax,
  compareRegimes,
  computeOldRegimeDeductions,
  computeCapitalGainsTax,
  compareRegimesWithCapitalGains,
} from "./engine.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** DOB string that produces the given age as of today */
const dobForAge = (age) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().split("T")[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// computeOldRegimeDeductions
// ─────────────────────────────────────────────────────────────────────────────

describe("computeOldRegimeDeductions", () => {
  it("returns only the standard deduction when no deductions supplied", () => {
    const { total, breakdown } = computeOldRegimeDeductions({}, 30);
    expect(total).toBe(50_000);
    expect(breakdown.standardDeduction).toBe(50_000);
  });

  it("caps sec80C at ₹1,50,000", () => {
    const { total, breakdown } = computeOldRegimeDeductions({ sec80C: 200_000 }, 30);
    expect(breakdown.sec80C).toBe(150_000);
    expect(total).toBe(200_000); // 150K + 50K std
  });

  it("does not allow sec80C above limit even at zero", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80C: 0 }, 30);
    expect(breakdown.sec80C).toBe(0);
  });

  it("caps sec80CCD1B at ₹50,000", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80CCD1B: 80_000 }, 30);
    expect(breakdown.sec80CCD1B).toBe(50_000);
  });

  it("caps 80D (self) at ₹25,000 for regular taxpayer (age < 60)", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80D_self: 40_000 }, 35);
    expect(breakdown.sec80D_self).toBe(25_000);
  });

  it("caps 80D (self) at ₹50,000 for senior citizen (age 60+)", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80D_self: 60_000 }, 65);
    expect(breakdown.sec80D_self).toBe(50_000);
  });

  it("caps 80D (parents) at ₹25,000 for non-senior-parent scenario", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80D_parents: 40_000 }, 35);
    expect(breakdown.sec80D_parents).toBe(25_000);
  });

  it("caps 80D (parents) at ₹50,000 for senior-citizen taxpayer", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80D_parents: 60_000 }, 62);
    expect(breakdown.sec80D_parents).toBe(50_000);
  });

  it("caps 80TTA at ₹10,000 for non-senior", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80TTA_TTB: 15_000 }, 40);
    expect(breakdown.sec80TTA_TTB).toBe(10_000);
  });

  it("uses 80TTB limit of ₹50,000 for senior citizen", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80TTA_TTB: 60_000 }, 65);
    expect(breakdown.sec80TTA_TTB).toBe(50_000);
  });

  it("caps home loan interest (24b) at ₹2,00,000", () => {
    const { breakdown } = computeOldRegimeDeductions({ homeLoanInterest: 300_000 }, 30);
    expect(breakdown.homeLoanInterest).toBe(200_000);
  });

  it("caps sec80G cash donations at ₹2,000 (Sec 80G proviso)", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80G_cash: 5_000 }, 30);
    expect(breakdown.sec80G_cash).toBe(2_000);
  });

  it("does NOT cap sec80G cheque/digital donations", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80G_cheque: 1_00_000 }, 30);
    expect(breakdown.sec80G_cheque).toBe(1_00_000);
  });

  it("accepts legacy sec80G field and treats it as digital donation (no cap)", () => {
    const { breakdown } = computeOldRegimeDeductions({ sec80G: 50_000 }, 30);
    // sec80G treated as cheque/digital
    expect(breakdown.sec80G).toBe(50_000);
  });

  it("HRA and LTA pass through uncapped", () => {
    const { breakdown } = computeOldRegimeDeductions({ hra: 1_20_000, lta: 50_000 }, 30);
    expect(breakdown.hra).toBe(1_20_000);
    expect(breakdown.lta).toBe(50_000);
  });

  it("adds standard deduction of ₹50,000 to all deductions total", () => {
    const { total, breakdown } = computeOldRegimeDeductions({ sec80C: 1_00_000 }, 30);
    expect(breakdown.standardDeduction).toBe(50_000);
    expect(total).toBe(1_00_000 + 50_000);
  });

  it("computes correct total with multiple capped deductions", () => {
    const { total } = computeOldRegimeDeductions({
      sec80C:           2_00_000, // capped at 1.5L
      sec80CCD1B:       60_000,   // capped at 50K
      sec80D_self:      30_000,   // capped at 25K
      sec80D_parents:   30_000,   // capped at 25K
      sec80TTA_TTB:     15_000,   // capped at 10K
      homeLoanInterest: 2_50_000, // capped at 2L
      hra:              1_00_000,
    }, 30);
    // 1,50,000 + 50,000 + 25,000 + 25,000 + 10,000 + 2,00,000 + 1,00,000 + 50,000 (std)
    expect(total).toBe(6_10_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeTax — New Regime
// ─────────────────────────────────────────────────────────────────────────────

describe("computeTax — new regime", () => {
  it("returns zero tax for zero income", () => {
    const r = computeTax({ grossIncome: 0, regime: "new" });
    expect(r.totalTax).toBe(0);
    expect(r.taxableIncome).toBe(0);
  });

  it("applies ₹75,000 standard deduction in new regime", () => {
    const r = computeTax({ grossIncome: 7_00_000, regime: "new" });
    expect(r.deductionTotal).toBe(75_000);
    expect(r.taxableIncome).toBe(6_25_000);
  });

  it("rounds taxable income DOWN to nearest ₹10", () => {
    const r = computeTax({ grossIncome: 7_00_009, regime: "new" });
    expect(r.taxableIncome % 10).toBe(0);
    expect(r.taxableIncome).toBe(6_25_000); // 700009 - 75000 = 625009 → floored to 625000
  });

  it("applies full 87A rebate: income ₹7,00,000 → zero tax", () => {
    const r = computeTax({ grossIncome: 7_00_000, regime: "new" });
    expect(r.rebateApplied).toBe(11_250); // slab tax before rebate
    expect(r.totalTax).toBe(0);
  });

  it("applies full 87A rebate: taxable income exactly ₹12,00,000 → zero tax", () => {
    // grossIncome 12,75,000 → taxable 12,00,000 (12,75,000 - 75,000)
    const r = computeTax({ grossIncome: 12_75_000, regime: "new" });
    expect(r.taxableIncome).toBe(12_00_000);
    expect(r.rebateApplied).toBe(60_000);
    expect(r.totalTax).toBe(0);
  });

  it("does NOT apply 87A when taxable income exceeds ₹12,00,000", () => {
    // grossIncome 13,50,000 → taxable 12,75,000
    const r = computeTax({ grossIncome: 13_50_000, regime: "new" });
    expect(r.taxableIncome).toBe(12_75_000);
    expect(r.rebateApplied).toBe(0);
    expect(r.totalTax).toBeGreaterThan(0);
  });

  it("computes correct tax for income ₹13,50,000 (taxable ₹12,75,000)", () => {
    // Slab: 20K(5%) + 40K(10%) + 75K*0.15=11,250 → 71,250 + 4% cess=2,850 → 74,100
    const r = computeTax({ grossIncome: 13_50_000, regime: "new" });
    expect(r.totalTax).toBe(74_100);
  });

  it("computes correct tax for income ₹20,00,000 (taxable ₹19,25,000)", () => {
    // Slab: 20K+40K+60K+65K = 185,000 + 4% cess = 7,400 → 192,400
    const r = computeTax({ grossIncome: 20_00_000, regime: "new" });
    expect(r.totalTax).toBe(1_92_400);
  });

  it("computes correct effective tax rate", () => {
    const r = computeTax({ grossIncome: 20_00_000, regime: "new" });
    expect(r.effectiveRate).toBe(parseFloat(((1_92_400 / 20_00_000) * 100).toFixed(2)));
  });

  it("caps new-regime surcharge at 25% when income > ₹50L", () => {
    // At 60L income, old surcharge would be 37% — new regime caps at 25%
    const r = computeTax({ grossIncome: 6_00_00_000, regime: "new" });
    const rawSurchargeRate = r.surcharge / (r.totalTax - r.cess - r.surcharge);
    expect(rawSurchargeRate).toBeLessThanOrEqual(0.25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeTax — Old Regime
// ─────────────────────────────────────────────────────────────────────────────

describe("computeTax — old regime", () => {
  it("returns zero tax for zero income", () => {
    const r = computeTax({ grossIncome: 0, regime: "old" });
    expect(r.totalTax).toBe(0);
  });

  it("applies ₹50,000 standard deduction in old regime", () => {
    const r = computeTax({ grossIncome: 5_00_000, regime: "old" });
    expect(r.deductionTotal).toBe(50_000);
    expect(r.taxableIncome).toBe(4_50_000);
  });

  it("applies 87A rebate: taxable income ₹4,50,000 → zero tax", () => {
    // grossIncome 5,00,000 → taxable 4,50,000 ≤ 5,00,000 → rebate
    const r = computeTax({ grossIncome: 5_00_000, regime: "old" });
    expect(r.rebateApplied).toBe(10_000); // 5% of 2,00,000 = 10K slab tax
    expect(r.totalTax).toBe(0);
  });

  it("does NOT apply 87A when taxable income > ₹5,00,000", () => {
    // grossIncome 6,00,000 → taxable 5,50,000 > 5,00,000
    const r = computeTax({ grossIncome: 6_00_000, regime: "old" });
    expect(r.rebateApplied).toBe(0);
    expect(r.totalTax).toBeGreaterThan(0);
  });

  it("computes correct tax: grossIncome ₹10,00,000, no deductions", () => {
    // taxable = 9,50,000; 12,500(5%) + 90,000(20%) = 102,500; cess = 4,100 → 106,600
    const r = computeTax({ grossIncome: 10_00_000, regime: "old" });
    expect(r.totalTax).toBe(1_06_600);
  });

  it("uses senior citizen slabs for age 60–79 (taxable ₹5,50,000)", () => {
    // Senior: 0-3L at 0%, 3L-5L at 5%, 5L-10L at 20%
    // taxable = 6,00,000 - 50,000 = 5,50,000
    // 3L-5L: 2,00,000*0.05 = 10,000 | 5L-5.5L: 50,000*0.20 = 10,000 → 20,000 + cess 800 = 20,800
    const r = computeTax({ grossIncome: 6_00_000, regime: "old", dateOfBirth: dobForAge(66) });
    expect(r.age).toBeGreaterThanOrEqual(60);
    expect(r.totalTax).toBe(20_800);
  });

  it("uses super-senior citizen slabs for age 80+ (taxable ₹5,50,000)", () => {
    // Super-senior: 0-5L at 0%, 5L+ at 20%
    // taxable = 5,50,000 → 50,000*0.20 = 10,000 + cess 400 = 10,400
    const r = computeTax({ grossIncome: 6_00_000, regime: "old", dateOfBirth: dobForAge(82) });
    expect(r.age).toBeGreaterThanOrEqual(80);
    expect(r.totalTax).toBe(10_400);
  });

  it("reduces taxable income correctly when sec80C deduction is applied", () => {
    const withDeduction    = computeTax({ grossIncome: 10_00_000, regime: "old", deductions: { sec80C: 1_50_000 } });
    const withoutDeduction = computeTax({ grossIncome: 10_00_000, regime: "old" });
    expect(withDeduction.taxableIncome).toBe(withoutDeduction.taxableIncome - 1_50_000);
    expect(withDeduction.totalTax).toBeLessThan(withoutDeduction.totalTax);
  });

  it("deductions cannot make taxableIncome negative — floors at zero", () => {
    const r = computeTax({
      grossIncome: 2_00_000,
      regime: "old",
      deductions: { sec80C: 1_50_000 }, // total deductions > gross
    });
    expect(r.taxableIncome).toBeGreaterThanOrEqual(0);
  });

  it("applies 10% surcharge at income > ₹50L with marginal relief", () => {
    // Income = 5,100,000 → taxable = 5,050,000 (> 50L threshold)
    // Base tax = 1,327,500; surcharge = min(132,750, 49,999) = 49,999 (marginal relief)
    const r = computeTax({ grossIncome: 51_00_000, regime: "old" });
    expect(r.surcharge).toBe(49_999);
    expect(r.totalTax).toBe(14_32_599);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// compareRegimes
// ─────────────────────────────────────────────────────────────────────────────

describe("compareRegimes", () => {
  it("returns both old and new regime results", () => {
    const r = compareRegimes({ grossIncome: 10_00_000 });
    expect(r).toHaveProperty("old");
    expect(r).toHaveProperty("new");
    expect(r.old.regime).toBe("old");
    expect(r.new.regime).toBe("new");
  });

  it("identifies new regime as better for mid-income earner with no deductions", () => {
    // At 12L gross: new → 0 (rebated), old → 163,800
    const r = compareRegimes({ grossIncome: 12_00_000 });
    expect(r.betterRegime).toBe("new");
    expect(r.savingsAmount).toBe(1_63_800);
  });

  it("identifies old regime as better when high deductions are claimed", () => {
    // At 30L gross with 9.5L deductions: old → 4,44,600, new → 5,79,800
    const r = compareRegimes({
      grossIncome: 30_00_000,
      deductions:  {
        sec80C:           1_50_000,
        sec80CCD1B:       50_000,
        sec80D_self:      50_000,
        sec80D_parents:   50_000,
        homeLoanInterest: 2_00_000,
        hra:              4_00_000,
      },
    });
    expect(r.betterRegime).toBe("old");
    expect(r.savingsAmount).toBeGreaterThan(0);
  });

  it("returns betterRegime as 'equal' when both regimes produce identical tax", () => {
    // Find a synthetic case where taxes are equal (or mock it)
    // Hard to find a real case — let's verify the logic via savingsAmount=0
    const r = compareRegimes({ grossIncome: 0 });
    expect(r.betterRegime).toBe("equal");
    expect(r.savingsAmount).toBe(0);
  });

  it("savingsAmount is always non-negative", () => {
    const cases = [5_00_000, 10_00_000, 15_00_000, 25_00_000, 50_00_000];
    for (const inc of cases) {
      const r = compareRegimes({ grossIncome: inc });
      expect(r.savingsAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it("includes otherIncome in gross income calculation", () => {
    const r1 = compareRegimes({ grossIncome: 10_00_000, otherIncome: 0 });
    const r2 = compareRegimes({ grossIncome: 10_00_000, otherIncome: 1_00_000 });
    expect(r2.old.grossIncome).toBe(11_00_000);
    expect(r2.old.totalTax).toBeGreaterThan(r1.old.totalTax);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeCapitalGainsTax
// ─────────────────────────────────────────────────────────────────────────────

describe("computeCapitalGainsTax", () => {
  it("taxes STCG u/s 111A at a flat 20% with no exemption", () => {
    const r = computeCapitalGainsTax({ stcg111A: 1_00_000 });
    expect(r.stcgTax).toBe(20_000);
    expect(r.totalCGTax).toBe(20_000);
  });

  it("exempts the first ₹1,25,000 of LTCG u/s 112A", () => {
    const r = computeCapitalGainsTax({ ltcg112A: 1_00_000 });
    expect(r.taxableLTCG).toBe(0);
    expect(r.ltcgTax).toBe(0);
  });

  it("taxes LTCG above the exemption at 12.5%", () => {
    const r = computeCapitalGainsTax({ ltcg112A: 2_00_000 });
    expect(r.taxableLTCG).toBe(75_000);
    expect(r.ltcgTax).toBe(9_375);
  });

  it("combines STCG and LTCG tax independently", () => {
    const r = computeCapitalGainsTax({ stcg111A: 50_000, ltcg112A: 3_00_000 });
    expect(r.stcgTax).toBe(10_000);
    expect(r.taxableLTCG).toBe(1_75_000);
    expect(r.ltcgTax).toBe(21_875);
    expect(r.totalCGTax).toBe(31_875);
  });

  it("returns zero tax when no capital gains supplied", () => {
    const r = computeCapitalGainsTax();
    expect(r.totalCGTax).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// compareRegimesWithCapitalGains
// ─────────────────────────────────────────────────────────────────────────────

describe("compareRegimesWithCapitalGains", () => {
  it("adds capital gains tax on top of slab tax even when 87A rebate zeroes the slab tax", () => {
    // Low enough slab income that 87A rebate fully zeroes slab tax in both regimes —
    // demonstrates capital gains tax survives independent of the slab-income rebate.
    const r = compareRegimesWithCapitalGains({
      grossIncome: 4_00_000,
      capitalGains: { stcg111A: 2_00_000 },
    });

    expect(r.new.slabTaxPostRebate).toBe(0);
    expect(r.old.slabTaxPostRebate).toBe(0);
    expect(r.new.capitalGains.totalCGTax).toBe(40_000);
    // totalTax = CG tax (40,000) + 4% cess on it (1,600) — no surcharge at this income level
    expect(r.new.totalTax).toBe(41_600);
    expect(r.old.totalTax).toBe(41_600);
  });

  it("matches plain compareRegimes when no capital gains are supplied", () => {
    const plain    = compareRegimes({ grossIncome: 60_00_000 });
    const withCG   = compareRegimesWithCapitalGains({ grossIncome: 60_00_000 });

    expect(withCG.old.totalTax).toBe(plain.old.totalTax);
    expect(withCG.new.totalTax).toBe(plain.new.totalTax);
  });

  it("includes capital gains in the income used to determine the surcharge band", () => {
    // Slab income alone is below every surcharge threshold, but adding a large
    // LTCG pushes combined total income into a surcharge band.
    const r = compareRegimesWithCapitalGains({
      grossIncome: 40_00_000,
      capitalGains: { ltcg112A: 1_50_00_000 },
    });

    expect(r.new.totalIncomeWithCG).toBeGreaterThan(50_00_000);
    expect(r.new.surcharge).toBeGreaterThan(0);
  });
});
