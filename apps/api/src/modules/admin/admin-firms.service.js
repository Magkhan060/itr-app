import User     from "../auth/auth.model.js";
import CAFirm   from "../ca/ca-firm.model.js";
import CAClient from "../ca/ca-client.model.js";
import Filing   from "../itr/filing.model.js";
import AuditLog from "./audit.model.js";

// CAClient/Filing key off the firm admin's individual userId (not caFirmId —
// see resolveOwnerUserId in ca-firm.service.js), so per-firm counts are
// computed against adminUserId rather than the firm document's own _id.
const getFirmStats = async (adminUserId, firmId) => {
  const [clientCount, filingCount, memberCount] = await Promise.all([
    CAClient.countDocuments({ caId: adminUserId, isActive: true }),
    Filing.countDocuments({ userId: adminUserId, caClientId: { $ne: null } }),
    User.countDocuments({ caFirmId: firmId }),
  ]);
  return { clientCount, filingCount, memberCount };
};

export const getAllFirms = async ({ page = 1, limit = 20, search = "" }) => {
  const firmQuery = search
    ? {
        $or: [
          { firmName:     { $regex: search, $options: "i" } },
          { icaiMemberNo: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [firms, total] = await Promise.all([
    CAFirm.find(firmQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("adminUserId", "fullName email mobile isActive")
      .lean(),
    CAFirm.countDocuments(firmQuery),
  ]);

  const enriched = await Promise.all(
    firms.map(async (firm) => ({
      ...firm,
      ...(await getFirmStats(firm.adminUserId?._id, firm._id)),
    }))
  );

  return { firms: enriched, total, page, limit, pages: Math.ceil(total / limit) };
};

export const getFirmDetail = async (firmId) => {
  const firm = await CAFirm.findById(firmId)
    .populate("adminUserId", "fullName email mobile isActive createdAt")
    .lean();
  if (!firm) throw Object.assign(new Error("Firm not found"), { status: 404 });

  const [stats, members] = await Promise.all([
    getFirmStats(firm.adminUserId?._id, firm._id),
    User.find({ caFirmId: firmId })
      .select("fullName email role isActive createdAt")
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return { ...firm, ...stats, members };
};

// Deactivating a firm blocks every CA user tied to it (ca_admin/ca_staff/
// ca_readonly) from logging in — mirrors the existing User.isActive login
// gate in auth.service.js. Reactivating restores the whole team symmetrically,
// since there's no independent per-member reason for them to have been
// deactivated other than the firm-level action.
export const toggleFirmActive = async (firmId, isActive, adminId) => {
  const firm = await CAFirm.findByIdAndUpdate(
    firmId,
    { $set: { isActive } },
    { new: true }
  );
  if (!firm) throw Object.assign(new Error("Firm not found"), { status: 404 });

  await User.updateMany({ caFirmId: firmId }, { $set: { isActive } });

  await AuditLog.create({
    adminId,
    action:   isActive ? "FIRM_ACTIVATED" : "FIRM_DEACTIVATED",
    targetId: firmId,
    before:   { isActive: !isActive },
    after:    { isActive },
  });

  return getFirmDetail(firmId);
};
