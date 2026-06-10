// Tax slabs for FY 2025-26 (AY 2026-27)
// All values in INR

export const OLD_REGIME_SLABS = [
  { min: 0,       max: 250000,  rate: 0.00 },
  { min: 250001,  max: 500000,  rate: 0.05 },
  { min: 500001,  max: 1000000, rate: 0.20 },
  { min: 1000001, max: Infinity, rate: 0.30 },
];

export const OLD_REGIME_SENIOR_SLABS = [    // 60–80 years
  { min: 0,       max: 300000,  rate: 0.00 },
  { min: 300001,  max: 500000,  rate: 0.05 },
  { min: 500001,  max: 1000000, rate: 0.20 },
  { min: 1000001, max: Infinity, rate: 0.30 },
];

export const OLD_REGIME_SUPER_SENIOR_SLABS = [  // 80+ years
  { min: 0,       max: 500000,  rate: 0.00 },
  { min: 500001,  max: 1000000, rate: 0.20 },
  { min: 1000001, max: Infinity, rate: 0.30 },
];

export const NEW_REGIME_SLABS = [
  { min: 0,       max: 400000,  rate: 0.00 },
  { min: 400001,  max: 800000,  rate: 0.05 },
  { min: 800001,  max: 1200000, rate: 0.10 },
  { min: 1200001, max: 1600000, rate: 0.15 },
  { min: 1600001, max: 2000000, rate: 0.20 },
  { min: 2000001, max: 2400000, rate: 0.25 },
  { min: 2400001, max: Infinity, rate: 0.30 },
];

// Rebate u/s 87A
export const REBATE_87A = {
  old: { maxIncome: 500000,  rebateAmount: 12500  },
  new: { maxIncome: 1200000, rebateAmount: 60000  },
};

// Surcharge rates
export const SURCHARGE_RATES = [
  { min: 5000001,  max: 10000000, rate: 0.10 },
  { min: 10000001, max: 20000000, rate: 0.15 },
  { min: 20000001, max: 50000000, rate: 0.25 },
  { min: 50000001, max: Infinity, rate: 0.37 },  // Old regime only
];

// Health & Education Cess
export const CESS_RATE = 0.04;  // 4% on tax + surcharge
