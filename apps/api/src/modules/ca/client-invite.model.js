import mongoose from "mongoose";

const clientInviteSchema = new mongoose.Schema(
  {
    caClientId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "CAClient",
      required: true,
      index:    true,
    },
    caId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
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

clientInviteSchema.index({ caClientId: 1, status: 1 });

export default mongoose.model("ClientInvite", clientInviteSchema);
