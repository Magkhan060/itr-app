import mongoose from "mongoose";

const caInviteSchema = new mongoose.Schema(
  {
    caFirmId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "CAFirm",
      required: true,
      index:    true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    role:  { type: String, enum: ["ca_staff", "ca_readonly"], required: true },
    token: { type: String, required: true, unique: true },
    status: {
      type:    String,
      enum:    ["pending", "accepted", "revoked", "expired"],
      default: "pending",
    },
    invitedBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    acceptedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    expiresAt:        { type: Date, required: true },
  },
  { timestamps: true }
);

caInviteSchema.index({ caFirmId: 1, email: 1, status: 1 });

export default mongoose.model("CAInvite", caInviteSchema);
