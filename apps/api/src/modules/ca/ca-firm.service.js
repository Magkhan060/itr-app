import User from "../auth/auth.model.js";
import CAFirm from "./ca-firm.model.js";
import { decrypt } from "../../utils/encryption.js";

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

// Decrypts and returns { emailConfig, smsConfig } for a firm, for passing
// straight into sendMail()/sendSMS() as firmEmailConfig/firmSmsConfig —
// null fields mean "this firm hasn't configured an override", which those
// utils already treat as "use the platform default" (same fallback shape
// as the existing ITD credential resolution in efiling.service.js).
export const getFirmCommsConfig = async (firmId) => {
  if (!firmId) return { emailConfig: null, smsConfig: null };
  const firm = await CAFirm.findById(firmId)
    .select("emailProvider emailConfigEncrypted smsProvider smsConfigEncrypted")
    .lean();
  if (!firm) return { emailConfig: null, smsConfig: null };

  const emailConfig = firm.emailProvider === "smtp" && firm.emailConfigEncrypted
    ? { ...JSON.parse(decrypt(firm.emailConfigEncrypted)), provider: firm.emailProvider }
    : null;
  const smsConfig = firm.smsProvider === "msg91" && firm.smsConfigEncrypted
    ? { ...JSON.parse(decrypt(firm.smsConfigEncrypted)), provider: firm.smsProvider }
    : null;

  return { emailConfig, smsConfig };
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
