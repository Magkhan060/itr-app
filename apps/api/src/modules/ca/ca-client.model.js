import mongoose from "mongoose";

const caClientSchema = new mongoose.Schema(
  {
    caId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    // Client identity
    fullName:    { type: String, required: true, trim: true },
    pan:         { type: String, required: true, uppercase: true, trim: true },
    email:       { type: String, lowercase: true, trim: true },
    mobile:      { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender:      { type: String, enum: ["M", "F", "T"] },
    fatherName:  { type: String, trim: true },
    aadhaar:     { type: String },            // stored plain — encrypted at filing level
    // Address — used to pre-fill ITR form
    addressLine1:{ type: String, trim: true },
    city:        { type: String, trim: true },
    pinCode:     { type: String, trim: true },
    employerName:{ type: String, trim: true },
    employerTAN: { type: String, uppercase: true, trim: true },
    bankAccountNo:   { type: String },  // stored plain; encrypted at filing level
    ifscCode:        { type: String, uppercase: true, trim: true },
    // Status
    isActive: { type: Boolean, default: true },
    notes:    { type: String },         // CA's internal notes about the client
    // Client Portal — set once the client accepts a portal invite and gets
    // their own taxpayer-role account linked to this record.
    linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// A CA cannot have two clients with the same PAN
caClientSchema.index({ caId: 1, pan: 1 }, { unique: true });

export default mongoose.model("CAClient", caClientSchema);
