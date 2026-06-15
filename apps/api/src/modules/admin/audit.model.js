import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      required: true,
    },
    action: {
      type:    String,
      required: true,
      enum:    ["ROLE_CHANGE", "USER_ACTIVATED", "USER_DEACTIVATED", "FLAG_TOGGLED"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    targetKey: {
      type: String,   // for feature flag actions
    },
    before: mongoose.Schema.Types.Mixed,
    after:  mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
