import User from "../auth/auth.model.js";
import CAFirm from "./ca-firm.model.js";

export const createFirmForAdmin = (adminUserId, { firmName, icaiMemberNo } = {}) =>
  CAFirm.create({ adminUserId, firmName, icaiMemberNo });

export const getFirmByAdminId = (adminUserId) =>
  CAFirm.findOne({ adminUserId }).lean();

export const getFirmById = (firmId) =>
  firmId ? CAFirm.findById(firmId).lean() : null;

export const getCAFirmIdForUser = async (userId) => {
  const user = await User.findById(userId).select("caFirmId").lean();
  if (!user?.caFirmId) throw Object.assign(new Error("CA firm not found"), { status: 404 });
  return user.caFirmId;
};

// Resolves the effective "owner" userId for CAClient/Filing queries.
// ca_admin acts as themselves; ca_staff/ca_readonly act on behalf of their firm's admin —
// this lets every CA User see and (per role) edit the same firm-wide client roster
// without re-scoping the CAClient/Filing schemas to caFirmId.
export const resolveOwnerUserId = async (userId, role) => {
  if (role !== "ca_staff" && role !== "ca_readonly") return userId;
  const user = await User.findById(userId).select("caFirmId").lean();
  if (!user?.caFirmId) throw Object.assign(new Error("CA firm not found"), { status: 404 });
  const firm = await CAFirm.findById(user.caFirmId).select("adminUserId").lean();
  if (!firm) throw Object.assign(new Error("CA firm not found"), { status: 404 });
  return String(firm.adminUserId);
};
