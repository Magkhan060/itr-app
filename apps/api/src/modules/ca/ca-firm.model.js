import mongoose from "mongoose";

const caFirmSchema = new mongoose.Schema(
  {
    adminUserId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },
    firmName:     { type: String, trim: true },
    icaiMemberNo: { type: String, trim: true },
    // ITD ERI/ASP credentials — optional, encrypted at rest.
    // Falls back to the platform-level env keys when absent (see efiling.service.js).
    itdApiBaseUrl:      { type: String, default: null },
    itdApiKeyEncrypted: { type: String, default: null },  // AES-256-CBC encrypted

    // Bring-your-own communications — optional, same fallback pattern as ITD
    // credentials above (see ca-firm.service.js's getFirmCommsConfig and
    // utils/email.util.js / utils/sms.util.js). Each *ConfigEncrypted field
    // holds an AES-256-CBC encrypted JSON blob (multiple secrets per
    // provider, e.g. SMTP host/port/user/pass), not a single key string.
    emailProvider:        { type: String, enum: ["platform", "smtp"], default: "platform" },
    emailConfigEncrypted: { type: String, default: null },
    smsProvider:          { type: String, enum: ["platform", "msg91"], default: "platform" },
    smsConfigEncrypted:   { type: String, default: null },

    isActive:           { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("CAFirm", caFirmSchema);
