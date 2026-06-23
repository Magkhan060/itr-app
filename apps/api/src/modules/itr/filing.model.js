import mongoose from "mongoose";

const tdsEntrySchema = new mongoose.Schema({
  tan:           { type: String, required: true },
  deductorName:  { type: String, required: true },
  amountDeducted:{ type: Number, required: true },
  quarter:       { type: String, enum: ["Q1","Q2","Q3","Q4"], required: true },
}, { _id: false });

const itr1DataSchema = new mongoose.Schema({
  // Personal
  fullName:             { type: String, required: true },
  pan:                  { type: String, required: true },
  dateOfBirth:          { type: Date   },
  gender:               { type: String, enum: ["M","F","T"] },
  residentialStatus:    { type: String, default: "ROR" },
  fatherName:           { type: String },
  // Address
  addressLine1:         { type: String },
  city:                 { type: String },
  pinCode:              { type: String },
  // Contact (linked to Aadhaar for EVC)
  mobile:               { type: String },
  aadhaarEncrypted:     { type: String },   // AES-256-CBC encrypted
  // Employer & banking
  employerName:         { type: String },
  employerTAN:          { type: String },
  bankAccountEncrypted: { type: String },   // AES-256-CBC encrypted
  ifscCode:             { type: String },

  // Income — salary breakdown matching Form 16 Part B
  basicSalary:        { type: Number, default: 0 },
  hra_received:       { type: Number, default: 0 },
  specialAllowance:   { type: Number, default: 0 },
  bonus:              { type: Number, default: 0 },
  grossSalary:        { type: Number, default: 0 },  // derived: sum of the four fields above, computed server-side on submit
  professionalTax:    { type: Number, default: 0 },
  tdsDeducted:        { type: Number, default: 0 },
  interestIncome:     { type: Number, default: 0 },
  otherIncome:        { type: Number, default: 0 },
  tdsEntries:         [tdsEntrySchema],

  // Deductions
  sec80C:             { type: Number, default: 0 },
  sec80CCD1B:         { type: Number, default: 0 },
  sec80D_self:        { type: Number, default: 0 },
  sec80D_parents:     { type: Number, default: 0 },
  homeLoanInterest:   { type: Number, default: 0 },
  hra_exempt:         { type: Number, default: 0 },
  lta:                { type: Number, default: 0 },
  sec80TTA_TTB:       { type: Number, default: 0 },
  sec80G_cash:        { type: Number, default: 0 },  // Cash donations — capped at ₹2,000 per Sec 80G
  sec80G_cheque:      { type: Number, default: 0 },  // Cheque/digital donations — fully qualifying

  // Tax computation result
  selectedRegime:     { type: String, enum: ["old","new"], default: "new" },
  taxComputation:     { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const housePropertySchema = new mongoose.Schema({
  type:            { type: String, enum: ["self_occupied", "let_out"], required: true },
  address:         { type: String },
  annualRent:      { type: Number, default: 0 },   // let_out only
  municipalTax:    { type: Number, default: 0 },   // let_out only
  interestOnLoan:  { type: Number, default: 0 },
}, { _id: false });

// ITR-2 — same personal/salary/deduction shape as ITR-1, plus multiple house
// properties (ITR-1 only supports one self-occupied property) and equity
// capital gains (Sec 111A STCG / Sec 112A LTCG — aggregate figures, not a
// transaction-level ledger; see CLAUDE.md "Client Portal"-style scope note).
const itr2DataSchema = new mongoose.Schema({
  // Personal
  fullName:             { type: String, required: true },
  pan:                  { type: String, required: true },
  dateOfBirth:          { type: Date   },
  gender:               { type: String, enum: ["M","F","T"] },
  residentialStatus:    { type: String, default: "ROR" },
  fatherName:           { type: String },
  // Address
  addressLine1:         { type: String },
  city:                 { type: String },
  pinCode:              { type: String },
  // Contact (linked to Aadhaar for EVC)
  mobile:               { type: String },
  aadhaarEncrypted:     { type: String },
  // Employer & banking
  employerName:         { type: String },
  employerTAN:          { type: String },
  bankAccountEncrypted: { type: String },
  ifscCode:             { type: String },

  // Income — salary (same breakdown as ITR-1)
  basicSalary:        { type: Number, default: 0 },
  hra_received:       { type: Number, default: 0 },
  specialAllowance:   { type: Number, default: 0 },
  bonus:              { type: Number, default: 0 },
  grossSalary:        { type: Number, default: 0 },  // derived server-side
  professionalTax:    { type: Number, default: 0 },
  tdsDeducted:        { type: Number, default: 0 },
  interestIncome:     { type: Number, default: 0 },
  otherIncome:        { type: Number, default: 0 },
  tdsEntries:         [tdsEntrySchema],

  // Income — house property (multiple, unlike ITR-1's single self-occupied)
  houseProperties:    [housePropertySchema],
  housePropertyNetIncome: { type: Number, default: 0 },  // derived server-side, can be negative (loss)

  // Income — equity capital gains (aggregate, not transaction-level)
  capitalGains: {
    stcg111A: { type: Number, default: 0 },
    ltcg112A: { type: Number, default: 0 },
  },

  // Deductions (Chapter VI-A — identical to ITR-1, minus homeLoanInterest:
  // house property interest is captured per-property in houseProperties[]
  // above instead, so it isn't double-counted as a separate deduction here).
  sec80C:             { type: Number, default: 0 },
  sec80CCD1B:         { type: Number, default: 0 },
  sec80D_self:        { type: Number, default: 0 },
  sec80D_parents:     { type: Number, default: 0 },
  hra_exempt:         { type: Number, default: 0 },
  lta:                { type: Number, default: 0 },
  sec80TTA_TTB:       { type: Number, default: 0 },
  sec80G_cash:        { type: Number, default: 0 },
  sec80G_cheque:      { type: Number, default: 0 },

  // Tax computation result — shape from compareRegimesWithCapitalGains()
  selectedRegime:     { type: String, enum: ["old","new"], default: "new" },
  taxComputation:     { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const filingSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    itrType: {
      type:    String,
      enum:    ["ITR-1","ITR-2","ITR-3","ITR-4","ITR-5","ITR-6","ITR-7"],
      default: "ITR-1",
    },
    assessmentYear: {
      type:    String,
      default: "2026-27",
    },
    financialYear: {
      type:    String,
      default: "2025-26",
    },
    status: {
      type:    String,
      enum:    ["draft","submitted","verified","processed","refund_initiated"],
      default: "draft",
    },
    itr1Data:      itr1DataSchema,
    itr2Data:      itr2DataSchema,
    submittedAt:   { type: Date },
    acknowledgementNo: { type: String },

    // e-Filing to ITD portal
    efilingStatus: { type: String, enum: ["not_started", "submitted", "failed"], default: "not_started" },
    itrVAckNo:     { type: String },
    efiledAt:      { type: Date },
    evcMethod:     { type: String, enum: ["aadhaar_otp", "bank_evc", "net_banking", "demat"] },

    // CA Portal — set when a CA files on behalf of a client
    caClientId:      { type: mongoose.Schema.Types.ObjectId, ref: "CAClient", default: null },
    preparedByCa:    { type: mongoose.Schema.Types.ObjectId, ref: "User",     default: null },
    // Client approval workflow
    approvalStatus:      { type: String, enum: ["not_sent", "pending", "approved", "rejected"], default: "not_sent" },
    approvalToken:       { type: String },           // UUID sent in approval email link
    approvalSentAt:      { type: Date },
    approvalRespondedAt: { type: Date },
    approvalComment:     { type: String },           // client's rejection note
  },
  { timestamps: true }
);

// One filing per (user OR ca-client) per AY per ITR type
// caClientId is null for self-filed returns, so the compound key stays unique per taxpayer
filingSchema.index({ userId: 1, caClientId: 1, assessmentYear: 1, itrType: 1 }, { unique: true });

export default mongoose.model("Filing", filingSchema);
