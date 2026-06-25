import User from "../auth/auth.model.js";
import CAFirm from "./ca-firm.model.js";
import { encrypt, decrypt } from "../../utils/encryption.js";
import { sendMail } from "../../utils/email.util.js";
import { sendSMS } from "../../utils/sms.util.js";

const REQUIRED_SMTP_FIELDS = ["host", "port", "user", "pass", "fromAddress"];
const REQUIRED_MSG91_FIELDS = ["apiKey", "senderId"];

// Decrypts a firm's stored config (or {} if none yet) — used both to
// pre-fill non-secret fields back to the client and to merge a partial
// update against whatever was already saved.
const decryptConfig = (encryptedBlob) => {
  if (!encryptedBlob) return {};
  try {
    return JSON.parse(decrypt(encryptedBlob));
  } catch {
    return {}; // corrupt/legacy data shouldn't crash Settings — treat as unset
  }
};

const formatFirm = (firm) => {
  const result = {
    caFirmName:            firm.firmName || "",
    caMemberNo:            firm.icaiMemberNo || "",
    caItdApiBaseUrl:       firm.itdApiBaseUrl || "",
    caItdApiKeyConfigured: !!firm.itdApiKeyEncrypted,

    emailProvider:  firm.emailProvider || "platform",
    emailConfigured: !!firm.emailConfigEncrypted,
    smsProvider:    firm.smsProvider || "platform",
    smsConfigured:   !!firm.smsConfigEncrypted,
  };

  // Pre-fill non-secret fields (host/port/user/fromAddress, sender ID, etc.)
  // so a CA rotating just their password/API key isn't forced to retype
  // everything else — the secret itself (pass/apiKey) is never sent back.
  if (firm.emailConfigEncrypted) {
    const { pass, ...rest } = decryptConfig(firm.emailConfigEncrypted);
    result.emailConfig = rest;
  }
  if (firm.smsConfigEncrypted) {
    const { apiKey, ...rest } = decryptConfig(firm.smsConfigEncrypted);
    result.smsConfig = rest;
  }

  return result;
};

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

export const updateCAProfile = async (caId, {
  caFirmName, caMemberNo, caItdApiBaseUrl, caItdApiKey,
  emailProvider, emailConfig,
  smsProvider, smsConfig,
}) => {
  const existing = await getFirmForCA(caId);

  const update = {};
  if (caFirmName      !== undefined) update.firmName      = caFirmName.trim();
  if (caMemberNo      !== undefined) update.icaiMemberNo  = caMemberNo.trim();
  if (caItdApiBaseUrl !== undefined) update.itdApiBaseUrl = caItdApiBaseUrl?.trim() || null;
  if (caItdApiKey !== undefined) {
    // Empty string clears the key; any non-empty value encrypts and stores it
    update.itdApiKeyEncrypted = caItdApiKey ? encrypt(caItdApiKey.trim()) : null;
  }

  if (emailProvider !== undefined) {
    update.emailProvider = emailProvider;
    if (emailProvider === "platform") {
      update.emailConfigEncrypted = null;
    } else {
      // Merge with whatever's already stored so re-entering only the
      // password doesn't blank out host/user/fromAddress.
      const merged = { ...decryptConfig(existing.emailConfigEncrypted), ...emailConfig };
      const missing = REQUIRED_SMTP_FIELDS.filter((f) => !merged[f]);
      if (missing.length) {
        throw Object.assign(
          new Error(`SMTP configuration is incomplete — missing: ${missing.join(", ")}`),
          { status: 400 }
        );
      }
      update.emailConfigEncrypted = encrypt(JSON.stringify(merged));
    }
  }

  if (smsProvider !== undefined) {
    update.smsProvider = smsProvider;
    if (smsProvider === "platform") {
      update.smsConfigEncrypted = null;
    } else {
      const merged = { ...decryptConfig(existing.smsConfigEncrypted), ...smsConfig };
      const missing = REQUIRED_MSG91_FIELDS.filter((f) => !merged[f]);
      if (missing.length) {
        throw Object.assign(
          new Error(`MSG91 configuration is incomplete — missing: ${missing.join(", ")}`),
          { status: 400 }
        );
      }
      update.smsConfigEncrypted = encrypt(JSON.stringify(merged));
    }
  }

  const firm = await CAFirm.findByIdAndUpdate(existing._id, { $set: update }, { new: true });
  return formatFirm(firm);
};

// ── Test-send — lets a CA confirm their configured provider actually works
// before relying on it for real client approval emails/SMS ──────────────────

export const sendTestEmail = async (caId, to) => {
  const firm = await getFirmForCA(caId);
  if (firm.emailProvider !== "smtp" || !firm.emailConfigEncrypted) {
    throw Object.assign(new Error("No custom email provider configured — nothing to test"), { status: 400 });
  }
  const emailConfig = decryptConfig(firm.emailConfigEncrypted);
  await sendMail({
    to,
    subject: "ITR Filing Portal — Test Email",
    html: "<p>This is a test email confirming your custom SMTP configuration is working.</p>",
    firmEmailConfig: { ...emailConfig, provider: "smtp" },
  });
  return { sent: true };
};

export const sendTestSMS = async (caId, to) => {
  const firm = await getFirmForCA(caId);
  if (firm.smsProvider !== "msg91" || !firm.smsConfigEncrypted) {
    throw Object.assign(new Error("No custom SMS provider configured — nothing to test"), { status: 400 });
  }
  const smsConfig = decryptConfig(firm.smsConfigEncrypted);
  await sendSMS({
    to,
    body: "ITR Filing Portal: this is a test SMS confirming your MSG91 configuration is working.",
    firmSmsConfig: { ...smsConfig, provider: "msg91" },
  });
  return { sent: true };
};
