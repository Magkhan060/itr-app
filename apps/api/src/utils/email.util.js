import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Platform default — lazily created once, unchanged from before. Firms that
// haven't configured their own SMTP override still go through this.
const createGmailTransport = () => {
  if (!env.gmailUser || !env.gmailPass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.gmailUser, pass: env.gmailPass },
  });
};

const gmailTransport = createGmailTransport();

// Generic SMTP — works for Office365, Zoho Mail, Amazon SES, SendGrid's SMTP
// relay, or any firm's own mail server. Built fresh per call rather than
// cached, since different firms have different configs (the platform
// Gmail transport above is the one case where a single shared instance is
// correct, since there's only ever one platform account).
const buildSmtpTransport = ({ host, port, secure, user, pass }) =>
  nodemailer.createTransport({
    host,
    port: Number(port),
    secure: !!secure,
    auth: { user, pass },
  });

// `firmEmailConfig` is the already-decrypted config object for a CAFirm that
// configured its own SMTP server (see ca-firm.service.js's
// getFirmCommsConfig) — undefined/null means "use the platform default",
// exactly like the existing ITD-credential fallback pattern.
export const sendMail = async ({ to, subject, html, firmEmailConfig }) => {
  if (firmEmailConfig) {
    const transport = buildSmtpTransport(firmEmailConfig);
    const fromName = firmEmailConfig.fromName || "ITR Filing Portal";
    return transport.sendMail({ from: `"${fromName}" <${firmEmailConfig.fromAddress}>`, to, subject, html });
  }

  if (!gmailTransport) {
    console.log(`[Email MOCK] To: ${to} | Subject: ${subject}`);
    return { mock: true };
  }
  return gmailTransport.sendMail({ from: `"ITR Filing Portal" <${env.gmailUser}>`, to, subject, html });
};

// ── Templates ─────────────────────────────────────────────────────────────────

export const approvalRequestEmail = ({ clientName, caName, caFirm, filingId, token, taxSummary, appUrl }) => ({
  subject: `Action Required: Approve Your ITR-1 Filing — FY 2025-26`,
  html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#1677ff;padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h2 style="color:#fff;margin:0">ITR Filing Portal</h2>
    <p style="color:rgba(255,255,255,0.85);margin:4px 0 0">FY 2025-26 | AY 2026-27</p>
  </div>
  <div style="background:#fff;border:1px solid #e8e8e8;border-top:none;padding:28px;border-radius:0 0 8px 8px">
    <p>Dear <strong>${clientName}</strong>,</p>
    <p>Your Chartered Accountant <strong>${caName}</strong>${caFirm ? ` (${caFirm})` : ""} has prepared your Income Tax Return (ITR-1) for <strong>FY 2025-26</strong> and is requesting your approval before filing.</p>

    <div style="background:#f6f8fa;border-radius:8px;padding:16px;margin:20px 0">
      <h3 style="margin:0 0 12px;color:#1677ff">Tax Summary</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#666">Gross Salary</td><td style="text-align:right;font-weight:600">₹${Number(taxSummary.grossSalary || 0).toLocaleString("en-IN")}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Total Tax Payable</td><td style="text-align:right;font-weight:600;color:#fa541c">₹${Number(taxSummary.totalTax || 0).toLocaleString("en-IN")}</td></tr>
        <tr><td style="padding:6px 0;color:#666">TDS Already Deducted</td><td style="text-align:right;font-weight:600">₹${Number(taxSummary.tdsDeducted || 0).toLocaleString("en-IN")}</td></tr>
        <tr style="border-top:2px solid #1677ff"><td style="padding:8px 0;font-weight:700">${(taxSummary.tdsDeducted || 0) > (taxSummary.totalTax || 0) ? "Refund Due" : "Balance Tax Payable"}</td><td style="text-align:right;font-weight:700;color:${(taxSummary.tdsDeducted || 0) > (taxSummary.totalTax || 0) ? "#52c41a" : "#fa541c"}">₹${Math.abs((taxSummary.tdsDeducted || 0) - (taxSummary.totalTax || 0)).toLocaleString("en-IN")}</td></tr>
      </table>
    </div>

    <p>Please click one of the buttons below to respond:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${appUrl}/approve/${token}?action=approve" style="background:#52c41a;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;margin-right:12px;display:inline-block">✓ Approve Filing</a>
      <a href="${appUrl}/approve/${token}?action=reject" style="background:#ff4d4f;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">✗ Request Changes</a>
    </div>

    <p style="color:#888;font-size:12px">This link is valid for 7 days. If you have questions, contact your CA directly.</p>
    <p style="color:#888;font-size:12px">Reference: Filing ID ${filingId}</p>
  </div>
</body>
</html>`,
});

export const caInviteEmail = ({ inviterName, firmName, role, token, appUrl }) => ({
  subject: `You've been invited to join ${firmName || "a CA practice"} on ITR Filing Portal`,
  html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#722ed1;padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h2 style="color:#fff;margin:0">You're Invited!</h2>
  </div>
  <div style="background:#fff;border:1px solid #e8e8e8;border-top:none;padding:28px;border-radius:0 0 8px 8px">
    <p><strong>${inviterName || "A CA Admin"}</strong> has invited you to join <strong>${firmName || "their CA practice"}</strong> on the ITR Filing Portal as a <strong>${role === "ca_staff" ? "Team Member" : "Read-Only Viewer"}</strong>.</p>
    <p>Click below to set up your account:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${appUrl}/join-firm/${token}" style="background:#722ed1;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Accept Invite</a>
    </div>
    <p style="color:#888;font-size:12px">This invite link is valid for 7 days.</p>
  </div>
</body>
</html>`,
});

export const clientPortalInviteEmail = ({ clientName, caName, firmName, token, appUrl }) => ({
  subject: `Access Your ITR Filings Online — Invitation from ${caName || "Your CA"}`,
  html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#13c2c2;padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h2 style="color:#fff;margin:0">Your CA Has Invited You</h2>
  </div>
  <div style="background:#fff;border:1px solid #e8e8e8;border-top:none;padding:28px;border-radius:0 0 8px 8px">
    <p>Dear <strong>${clientName}</strong>,</p>
    <p><strong>${caName || "Your CA"}</strong>${firmName ? ` (${firmName})` : ""} has invited you to create a free account on the ITR Filing Portal, where you can view your filings, download your ITR XML, and track your refund status — any time, without contacting your CA.</p>
    <p>Click below to set up your account. You'll need to confirm your PAN and choose a password:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${appUrl}/client-portal/join/${token}" style="background:#13c2c2;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Set Up My Account</a>
    </div>
    <p style="color:#888;font-size:12px">This invite link is valid for 7 days.</p>
  </div>
</body>
</html>`,
});

export const approvalResponseEmail = ({ caName, clientName, status, comment }) => ({
  subject: `Client ${status === "approved" ? "Approved" : "Rejected"} ITR Filing — ${clientName}`,
  html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:${status === "approved" ? "#52c41a" : "#ff4d4f"};padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h2 style="color:#fff;margin:0">${status === "approved" ? "✓ Filing Approved" : "✗ Changes Requested"}</h2>
  </div>
  <div style="background:#fff;border:1px solid #e8e8e8;border-top:none;padding:28px;border-radius:0 0 8px 8px">
    <p>Dear <strong>${caName}</strong>,</p>
    <p>Your client <strong>${clientName}</strong> has <strong>${status === "approved" ? "approved" : "requested changes to"}</strong> their ITR-1 filing for FY 2025-26.</p>
    ${comment ? `<div style="background:#fff7e6;border-left:4px solid #faad14;padding:12px 16px;border-radius:4px;margin:16px 0"><strong>Client comment:</strong><br>${comment}</div>` : ""}
    <p>Log in to the ITR Filing Portal to ${status === "approved" ? "proceed with e-filing" : "revise and re-submit for approval"}.</p>
  </div>
</body>
</html>`,
});
