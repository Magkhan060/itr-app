import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    pan: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    // Aadhaar stored encrypted
    aadhaarEncrypted: {
      type: String,
      default: null,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    // Senior citizen flags derived from DOB at computation time
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },    
    role: {
      type:    String,
      // ca_staff / ca_readonly / platform_support are reserved for Phase 2 — not yet assignable.
      enum:    ["taxpayer", "ca_admin", "ca_staff", "ca_readonly", "platform_admin", "platform_support"],
      default: "taxpayer",
    },
    // Set for ca_admin / ca_staff / ca_readonly — links the user to their CA practice.
    // Firm-level details (name, ICAI number, ITD credentials) live on the CAFirm document.
    caFirmId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "CAFirm",
      default: null,
    },
    // Set for a taxpayer who accepted a Client Portal invite — links this
    // account to the CAClient record their CA already maintains, so they can
    // view (read-only) the filings prepared on their behalf.
    linkedCAClientId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "CAClient",
      default: null,
    },
  },
  { timestamps: true }
);

// Never expose sensitive fields in JSON responses.
// Pass the CAFirm document (if loaded by the caller) to include firm display fields.
userSchema.methods.toSafeObject = function (firm = null) {
  return {
    id:          this._id,
    pan:         this.pan,
    fullName:    this.fullName,
    email:       this.email,
    mobile:      this.mobile,
    dateOfBirth: this.dateOfBirth,
    createdAt:   this.createdAt,
    role:        this.role,
    isActive:    this.isActive,
    caFirmId:    this.caFirmId || null,
    caFirmName:  firm?.firmName     || null,
    caMemberNo:  firm?.icaiMemberNo || null,
    linkedCAClientId: this.linkedCAClientId || null,
  };
};

export default mongoose.model("User", userSchema);
