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
    isActive:           { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("CAFirm", caFirmSchema);
