import {
  OLD_REGIME_SLABS,
  OLD_REGIME_SENIOR_SLABS,
  OLD_REGIME_SUPER_SENIOR_SLABS,
  NEW_REGIME_SLABS,
  REBATE_87A,
  SURCHARGE_RATES,
  CESS_RATE,
  DEDUCTION_LIMITS,
} from "@itr-app/shared-types";

// ── Helpers ────────────────────────────────────────────────────────────────

const getAge = (dateOfBirth) => {
  if (!dateOfBirth) return 30;
  const dob   = new Date(dateOfBirth);
  const today = new Date();
  let age     = today.getFullYear() - dob.getFullYear();
  const m     = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

const applySlabs = (taxableIncome, slabs) => {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= 0) break;
    const slabSize = slab.max === Infinity
      ? taxableIncome
      : Math.min(taxableIncome, slab.max) - slab.min + 1;
    if (taxableIncome > slab.min - 1) {
      tax += Math.max(0, Math.min(taxableIncome, slab.max) - slab.min + 1) * slab.rate;
    }
  }
  return Math.round(tax);
};

const applyRebate87A = (tax, totalIncome, regime) => {
  const { maxIncome, rebateAmount } = REBATE_87A[regime];
  if (totalIncome <= maxIncome) {
    return Math.max(0, tax - Math.min(tax, rebateAmount));
  }
  return tax;
};

const applySurcharge = (tax, totalIncome, regime) => {
  // New regime surcharge capped at 25%
  const maxRate     = regime === "new" ? 0.25 : 1;
  let surchargeRate = 0;

  for (const band of SURCHARGE_RATES) {
    if (totalIncome >= band.min && totalIncome <= band.max) {
      surchargeRate = Math.min(band.rate, maxRate);
      break;
    }
  }

  // Marginal relief — surcharge cannot exceed income above threshold
  if (surchargeRate > 0) {
    const threshold  = SURCHARGE_RATES.find((b) => totalIncome >= b.min)?.min || 0;
    const surcharge  = tax * surchargeRate;
    const maxSurcharge = totalIncome - threshold;
    return Math.round(Math.min(surcharge, maxSurcharge));
  }
  return 0;
};

// ── Old Regime Deductions ──────────────────────────────────────────────────

export const computeOldRegimeDeductions = (deductions = {}, age = 30) => {
  const {
    sec80C           = 0,
    sec80CCD1B       = 0,
    sec80D_self      = 0,
    sec80D_parents   = 0,
    sec80G           = 0,
    sec80TTA_TTB     = 0,
    homeLoanInterest = 0,
    hra              = 0,
    lta              = 0,
    otherDeductions  = 0,
  } = deductions;

  const isSenior      = age >= 60;
  const isSuperSenior = age >= 80;

  const d80C       = Math.min(sec80C, DEDUCTION_LIMITS.SEC_80C);
  const d80CCD1B   = Math.min(sec80CCD1B, DEDUCTION_LIMITS.SEC_80CCD_1B);
  const d80D_self  = Math.min(
    sec80D_self,
    isSenior ? DEDUCTION_LIMITS.SEC_80D_SELF_SENIOR : DEDUCTION_LIMITS.SEC_80D_SELF
  );
  const d80D_par   = Math.min(
    sec80D_parents,
    isSenior ? DEDUCTION_LIMITS.SEC_80D_PARENTS_SR : DEDUCTION_LIMITS.SEC_80D_PARENTS
  );
  const d80TTA_TTB = Math.min(
    sec80TTA_TTB,
    isSenior ? DEDUCTION_LIMITS.SEC_80TTB : DEDUCTION_LIMITS.SEC_80TTA
  );
  const dHLP       = Math.min(homeLoanInterest, 200000); // Section 24(b)

  const total = d80C + d80CCD1B + d80D_self + d80D_par +
                d80TTA_TTB + dHLP + hra + lta + sec80G + otherDeductions;

  return {
    breakdown: {
      sec80C:           d80C,
      sec80CCD1B:       d80CCD1B,
      sec80D_self:      d80D_self,
      sec80D_parents:   d80D_par,
      sec80TTA_TTB:     d80TTA_TTB,
      homeLoanInterest: dHLP,
      hra,
      lta,
      sec80G,
      otherDeductions,
      standardDeduction: DEDUCTION_LIMITS.STANDARD_DED_OLD,
    },
    total: total + DEDUCTION_LIMITS.STANDARD_DED_OLD,
  };
};

// ── Core Tax Computation ───────────────────────────────────────────────────

export const computeTax = ({
  grossIncome       = 0,
  otherIncome       = 0,
  deductions        = {},
  regime            = "new",
  dateOfBirth       = null,
}) => {
  const age           = getAge(dateOfBirth);
  const isSenior      = age >= 60;
  const isSuperSenior = age >= 80;
  const totalGross    = grossIncome + otherIncome;

  let taxableIncome   = 0;
  let deductionTotal  = 0;
  let deductionBreakdown = {};

  if (regime === "old") {
    const { total, breakdown } = computeOldRegimeDeductions(deductions, age);
    deductionTotal     = total;
    deductionBreakdown = breakdown;
    taxableIncome      = Math.max(0, totalGross - deductionTotal);
  } else {
    // New regime — only standard deduction allowed
    deductionTotal     = DEDUCTION_LIMITS.STANDARD_DEDUCTION;
    deductionBreakdown = { standardDeduction: DEDUCTION_LIMITS.STANDARD_DEDUCTION };
    taxableIncome      = Math.max(0, totalGross - deductionTotal);
  }

  // Round down to nearest 10
  taxableIncome = Math.floor(taxableIncome / 10) * 10;

  // Pick correct slab
  let slabs;
  if (regime === "old") {
    slabs = isSuperSenior
      ? OLD_REGIME_SUPER_SENIOR_SLABS
      : isSenior
        ? OLD_REGIME_SENIOR_SLABS
        : OLD_REGIME_SLABS;
  } else {
    slabs = NEW_REGIME_SLABS;
  }

  let tax = applySlabs(taxableIncome, slabs);

  // Rebate u/s 87A
  const rebateApplied = tax > 0 && taxableIncome <= REBATE_87A[regime].maxIncome
    ? Math.min(tax, REBATE_87A[regime].rebateAmount)
    : 0;
  tax = Math.max(0, tax - rebateApplied);

  // Surcharge
  const surcharge = applySurcharge(tax, taxableIncome, regime);
  tax += surcharge;

  // Cess
  const cess = Math.round(tax * CESS_RATE);
  const totalTax = tax + cess;

  // Effective rate
  const effectiveRate = totalGross > 0
    ? parseFloat(((totalTax / totalGross) * 100).toFixed(2))
    : 0;

  return {
    regime,
    grossIncome:     totalGross,
    deductionTotal,
    deductionBreakdown,
    taxableIncome,
    taxBeforeRebate: tax + rebateApplied - surcharge,
    rebateApplied,
    surcharge,
    cess,
    totalTax,
    effectiveRate,
    age,
  };
};

// ── Regime Comparison ──────────────────────────────────────────────────────

export const compareRegimes = (input) => {
  const oldRegime = computeTax({ ...input, regime: "old" });
  const newRegime = computeTax({ ...input, regime: "new" });
  const savings   = oldRegime.totalTax - newRegime.totalTax;

  return {
    old:            oldRegime,
    new:            newRegime,
    betterRegime:   savings > 0 ? "new" : savings < 0 ? "old" : "equal",
    savingsAmount:  Math.abs(savings),
  };
};
