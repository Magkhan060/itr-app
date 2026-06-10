// All monetary limits in INR (display) — stored as paise in DB

export const ASSESSMENT_YEARS = {
  AY_2026_27: "2026-27",  // Current
  AY_2025_26: "2025-26",
};

export const CURRENT_AY = ASSESSMENT_YEARS.AY_2026_27;
export const CURRENT_FY = "2025-26";

export const DEDUCTION_LIMITS = {
  SEC_80C:            150000,  // PF, ELSS, LIC, PPF etc.
  SEC_80CCD_1B:        50000,  // NPS additional
  SEC_80D_SELF:        25000,  // Health insurance (self)
  SEC_80D_SELF_SENIOR: 50000,  // Health insurance (self, senior citizen)
  SEC_80D_PARENTS:     25000,  // Health insurance (parents)
  SEC_80D_PARENTS_SR:  50000,  // Health insurance (parents, senior)
  SEC_80TTA:           10000,  // Savings interest (non-senior)
  SEC_80TTB:           50000,  // Interest income (senior citizen)
  SEC_80G_CASH_LIMIT:  2000,   // Cash donation limit for 80G
  HRA_METRO_PERCENT:   0.50,   // 50% of basic for metro cities
  HRA_NON_METRO_PCT:   0.40,   // 40% of basic for non-metro
  STANDARD_DEDUCTION:  75000,  // FY 2025-26 (new regime)
  STANDARD_DED_OLD:    50000,  // Old regime standard deduction
};

export const METRO_CITIES = ["Mumbai", "Delhi", "Kolkata", "Chennai"];

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const AADHAAR_REGEX = /^[2-9]{1}[0-9]{11}$/;
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;

export const ITR_FORMS = {
  ITR_1: { code: "ITR-1", name: "Sahaj",    flagKey: "ITR_1" },
  ITR_2: { code: "ITR-2", name: "ITR-2",    flagKey: "ITR_2" },
  ITR_3: { code: "ITR-3", name: "ITR-3",    flagKey: "ITR_3" },
  ITR_4: { code: "ITR-4", name: "Sugam",    flagKey: "ITR_4" },
  ITR_5: { code: "ITR-5", name: "ITR-5",    flagKey: "ITR_5" },
  ITR_6: { code: "ITR-6", name: "ITR-6",    flagKey: "ITR_6" },
  ITR_7: { code: "ITR-7", name: "ITR-7",    flagKey: "ITR_7" },
};
