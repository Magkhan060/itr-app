import { env } from "../config/env.js";

// Initialise the Twilio client once if credentials are present.
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

export const sendSMS = async ({ to, body }) => {
  const phone = to.startsWith("+") ? to : `+91${to}`;
  try {
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
