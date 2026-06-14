import { computeTax } from "./engine.service.js";

// Advance tax due dates for FY 2025-26
export const ADVANCE_TAX_SCHEDULE = [
  { installment: 1, dueDate: "2025-06-15", cumulativePercent: 15, quarter: "Q1" },
  { installment: 2, dueDate: "2025-09-15", cumulativePercent: 45, quarter: "Q2" },
  { installment: 3, dueDate: "2025-12-15", cumulativePercent: 75, quarter: "Q3" },
  { installment: 4, dueDate: "2026-03-15", cumulativePercent: 100, quarter: "Q4" },
];

export const computeAdvanceTax = ({
  grossIncome,
  otherIncome   = 0,
  deductions    = {},
  regime        = "new",
  dateOfBirth   = null,
  tdsDeducted   = 0,
}) => {
  // Full year tax liability
  const result       = computeTax({ grossIncome, otherIncome, deductions, regime, dateOfBirth });
  const totalTax     = result.totalTax;
  const netTaxDue    = Math.max(0, totalTax - tdsDeducted);

  // Advance tax applicable only if net liability > ₹10,000
  const applicable   = netTaxDue > 10000;

  const today        = new Date();

  const installments = ADVANCE_TAX_SCHEDULE.map((schedule, idx) => {
    const cumAmount  = Math.round((netTaxDue * schedule.cumulativePercent) / 100);
    const prevCum    = idx === 0
      ? 0
      : Math.round((netTaxDue * ADVANCE_TAX_SCHEDULE[idx - 1].cumulativePercent) / 100);
    const dueAmount  = cumAmount - prevCum;
    const dueDate    = new Date(schedule.dueDate);
    const isPast     = dueDate < today;
    const isDue      = !isPast && dueDate > today;

    return {
      installment:        schedule.installment,
      quarter:            schedule.quarter,
      dueDate:            schedule.dueDate,
      cumulativePercent:  schedule.cumulativePercent,
      cumulativeAmount:   cumAmount,
      installmentAmount:  dueAmount,
      status:             isPast ? "due" : "upcoming",
    };
  });

  return {
    totalTaxLiability:  totalTax,
    tdsDeducted,
    netTaxDue,
    applicable,
    message: !applicable
      ? "Advance tax not applicable — net liability ≤ ₹10,000"
      : "Pay advance tax by respective due dates to avoid interest u/s 234B & 234C",
    regime,
    taxBreakdown:       result,
    installments,
  };
};
