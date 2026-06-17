// Statutory due dates under the Income Tax Act for AY 2026-27 (FY 2025-26).
// These are the baseline statutory dates — CBDT occasionally extends them by
// circular/notification; always confirm against the latest CBDT press release
// before treating a date as final.

export const COMPLIANCE_CALENDAR_AY_2026_27 = [
  {
    date:  "2026-06-15",
    label: "Advance Tax — Q1 (15%)",
    type:  "advance_tax",
  },
  {
    date:  "2026-07-31",
    label: "ITR Filing — Non-Audit Cases",
    description: "Due date for individuals/entities not requiring a tax audit (Sec 139(1)).",
    type:  "itr_deadline",
  },
  {
    date:  "2026-09-15",
    label: "Advance Tax — Q2 (45%)",
    type:  "advance_tax",
  },
  {
    date:  "2026-10-31",
    label: "ITR Filing — Audit Cases",
    description: "Due date for entities requiring a tax audit report under Sec 44AB.",
    type:  "itr_deadline",
  },
  {
    date:  "2026-11-30",
    label: "ITR Filing — Transfer Pricing Cases",
    description: "Due date for cases with international/specified domestic transactions (Sec 92E).",
    type:  "itr_deadline",
  },
  {
    date:  "2026-12-15",
    label: "Advance Tax — Q3 (75%)",
    type:  "advance_tax",
  },
  {
    date:  "2026-12-31",
    label: "Belated / Revised Return Deadline",
    description: "Last date to file a belated return or revise an already-filed return (Sec 139(4)/139(5)).",
    type:  "itr_deadline",
  },
  {
    date:  "2027-03-15",
    label: "Advance Tax — Q4 (100%)",
    type:  "advance_tax",
  },
];
