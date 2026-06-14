export const FLAGS = {
  // ── ITR Form Types ─────────────────────────────────────────
  ITR_1: { enabled: true,  label: "ITR-1 (Salaried)"            },
  ITR_2: { enabled: true,  label: "ITR-2 (Capital Gains)"       },
  ITR_3: { enabled: false, label: "ITR-3 (Business/Profession)" },
  ITR_4: { enabled: false, label: "ITR-4 (Presumptive Income)"  },
  ITR_5: { enabled: false, label: "ITR-5 (Firms / LLP)"         },
  ITR_6: { enabled: false, label: "ITR-6 (Companies)"           },
  ITR_7: { enabled: false, label: "ITR-7 (Trusts / NGOs)"       },

  // ── Sub-features ───────────────────────────────────────────
  FORM_16_PARSER:    { enabled: true,  label: "Form 16 Upload & Parse"    },
  FORM_26AS_IMPORT:  { enabled: true,  label: "26AS / AIS Import"         },
  EFILING_DIRECT:    { enabled: false, label: "Direct e-Filing (ITD API)" },
  REGIME_COMPARISON: { enabled: true,  label: "Old vs New Regime Compare" },
  ADVANCE_TAX_CALC:  { enabled: true,  label: "Advance Tax Calculator"    },
  DOCUMENT_VAULT:    { enabled: false, label: "Document Vault"            },
  REFUND_TRACKER:    { enabled: true, label: "Refund Status Tracker"     },
  PREFILL_ITD:       { enabled: false, label: "Pre-fill from ITD Portal"  },
};

export const isEnabled = (flagKey) => FLAGS[flagKey]?.enabled ?? false;
