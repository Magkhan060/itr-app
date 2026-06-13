import mongoose from "mongoose";

const tdsEntrySchema = new mongoose.Schema({
  tan:           { type: String, required: true },
  deductorName:  { type: String, required: true },
  amountDeducted:{ type: Number, required: true },
  quarter:       { type: String, enum: ["Q1","Q2","Q3","Q4"], required: true },
}, { _id: false });

const itr1DataSchema = new mongoose.Schema({
  // Personal
  fullName:           { type: String, required: true },
  pan:                { type: String, required: true },
  dateOfBirth:        { type: Date   },
  gender:             { type: String, enum: ["M","F","T"] },
  residentialStatus:  { type: String, default: "ROR" },
  city:               { type: String },
  employerName:       { type: String },
  employerTAN:        { type: String },
  bankAccountNo:      { type: String },
  ifscCode:           { type: String },

  // Income
  basicSalary:        { type: Number, default: 0 },
  hra_received:       { type: Number, default: 0 },
  specialAllowance:   { type: Number, default: 0 },
  bonus:              { type: Number, default: 0 },
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
  sec80G:             { type: Number, default: 0 },

  // Tax computation result
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
    submittedAt:   { type: Date },
    acknowledgementNo: { type: String },
  },
  { timestamps: true }
);

// One active filing per user per AY per ITR type
filingSchema.index({ userId: 1, assessmentYear: 1, itrType: 1 }, { unique: true });

export default mongoose.model("Filing", filingSchema);
