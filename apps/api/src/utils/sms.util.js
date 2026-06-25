import axios from "axios";
import { env } from "../config/env.js";

// Initialise the Twilio client once if credentials are present — this is
// the platform default, used when a firm hasn't configured its own gateway.
// If absent the app still starts — sendSMS logs to console instead.
let twilioClient = null;

if (env.twilioSid && env.twilioToken) {
  try {
    const { default: twilio } = await import("twilio");
    twilioClient = twilio(env.twilioSid, env.twilioToken);
  } catch {
    console.warn("[SMS] twilio package not found — SMS will be logged to console only");
  }
}

// MSG91 — a plain HTTP REST API, no SDK needed. Relevant for Indian SMS in
// particular: TRAI's DLT framework requires a pre-registered sender ID and
// template with a DLT-compliant gateway, which Twilio is not by default.
const sendViaMsg91 = async ({ to, body, apiKey, senderId, route }) => {
  const phone = to.startsWith("+") ? to.replace("+", "") : `91${to}`;
  const res = await axios.post(
    "https://api.msg91.com/api/v5/flow/",
    { mobile: phone, sender: senderId, route: route || "4", sms: body },
    { headers: { authkey: apiKey, "Content-Type": "application/json" } }
  );
  return res.data;
};

// `firmSmsConfig` is the already-decrypted config object for a CAFirm that
// configured its own SMS gateway (see ca-firm.service.js's
// getFirmCommsConfig) — undefined/null means "use the platform default".
export const sendSMS = async ({ to, body, firmSmsConfig }) => {
  const phone = to.startsWith("+") ? to : `+91${to}`;
  try {
    if (firmSmsConfig?.provider === "msg91") {
      return await sendViaMsg91({ to, body, ...firmSmsConfig });
    }

    if (!twilioClient) {
      console.log(`[SMS MOCK] To: ${phone} | ${body}`);
      return { mock: true };
    }
    return await twilioClient.messages.create({ from: env.twilioFrom, to: phone, body });
  } catch (err) {
    // SMS failures are non-fatal
    console.error("[SMS Error]", err.message);
    return { error: err.message };
  }
};

// ── Message templates ──────────────────────────────────────────────────────────

export const approvalSMS = (clientName, approveUrl) =>
  `ITR Portal: Dear ${clientName}, your CA has prepared your ITR-1 for FY 2025-26. Review & approve: ${approveUrl}`;

export const approvalResponseSMS = (clientName, status) =>
  `ITR Portal: ${clientName} has ${status === "approved" ? "APPROVED" : "REQUESTED CHANGES to"} their ITR-1 filing. Log in to proceed.`;

export const clientPortalInviteSMS = (clientName, joinUrl) =>
  `ITR Portal: Dear ${clientName}, your CA has invited you to view your ITR filings online. Set up your account: ${joinUrl}`;
