import User from "../auth/auth.model.js";
import CAFirm from "./ca-firm.model.js";
import { encrypt } from "../../utils/encryption.js";

const formatFirm = (firm) => ({
  caFirmName:            firm.firmName || "",
  caMemberNo:            firm.icaiMemberNo || "",
  caItdApiBaseUrl:       firm.itdApiBaseUrl || "",
  caItdApiKeyConfigured: !!firm.itdApiKeyEncrypted,
});

const getFirmForCA = async (caId) => {
  const user = await User.findById(caId).select("caFirmId").lean();
  if (!user?.caFirmId) throw Object.assign(new Error("CA firm not found"), { status: 404 });
  const firm = await CAFirm.findById(user.caFirmId);
  if (!firm) throw Object.assign(new Error("CA firm not found"), { status: 404 });
  return firm;
};

export const getCAProfile = async (caId) => {
  const firm = await getFirmForCA(caId);
  return formatFirm(firm);
};

export const updateCAProfile = async (caId, { caFirmName, caMemberNo, caItdApiBaseUrl, caItdApiKey }) => {
  const existing = await getFirmForCA(caId);

  const update = {};
  if (caFirmName      !== undefined) update.firmName      = caFirmName.trim();
  if (caMemberNo      !== undefined) update.icaiMemberNo  = caMemberNo.trim();
  if (caItdApiBaseUrl !== undefined) update.itdApiBaseUrl = caItdApiBaseUrl?.trim() || null;
  if (caItdApiKey !== undefined) {
    // Empty string clears the key; any non-empty value encrypts and stores it
    update.itdApiKeyEncrypted = caItdApiKey ? encrypt(caItdApiKey.trim()) : null;
  }

  const firm = await CAFirm.findByIdAndUpdate(existing._id, { $set: update }, { new: true });
  return formatFirm(firm);
};
