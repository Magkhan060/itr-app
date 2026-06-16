import { randomUUID } from "crypto";
import Filing    from "../itr/filing.model.js";
import CAClient  from "../ca/ca-client.model.js";
import User      from "../auth/auth.model.js";
import { sendMail, approvalRequestEmail, approvalResponseEmail } from "../../utils/email.util.js";
import { sendSMS, approvalSMS, approvalResponseSMS } from "../../utils/sms.util.js";
import { env } from "../../config/env.js";

// ── Send approval request to client ──────────────────────────────────────────

export const sendApprovalRequest = async (caId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, preparedByCa: caId });
  if (!filing) throw Object.assign(new Error("Filing not found or not prepared by you"), { status: 404 });
  if (filing.status !== "submitted") throw Object.assign(new Error("Filing must be submitted before sending for approval"), { status: 400 });

  const client = await CAClient.findById(filing.caClientId);
  if (!client) throw Object.assign(new Error("Client record not found"), { status: 404 });

  const ca = await User.findById(caId).select("fullName caFirmName email").lean();

  const token = randomUUID();
  await Filing.findByIdAndUpdate(filingId, {
    $set: {
      approvalStatus: "pending",
      approvalToken:  token,
      approvalSentAt: new Date(),
    },
  });

  const taxSummary = {
    grossSalary: filing.itr1Data?.grossSalary,
    totalTax:    filing.itr1Data?.taxComputation?.totalTax,
    tdsDeducted: filing.itr1Data?.tdsDeducted,
  };

  // Send email
  if (client.email) {
    const template = approvalRequestEmail({
      clientName: client.fullName,
      caName:     ca.fullName,
      caFirm:     ca.caFirmName,
      filingId,
      token,
      taxSummary,
      appUrl:     env.appUrl,
    });
    await sendMail({ to: client.email, ...template });
  }

  // Send SMS
  if (client.mobile) {
    await sendSMS({
      to:   client.mobile,
      body: approvalSMS(client.fullName, `${env.appUrl}/approve/${token}`),
    });
  }

  return { approvalToken: token, sentTo: { email: client.email || null, mobile: client.mobile || null } };
};

// ── Public: resolve token to filing summary (no auth required) ────────────────

export const getApprovalSummary = async (token) => {
  const filing = await Filing.findOne({ approvalToken: token })
    .select("itr1Data assessmentYear approvalStatus acknowledgementNo caClientId preparedByCa")
    .lean();
  if (!filing) throw Object.assign(new Error("Approval link is invalid or has expired"), { status: 404 });

  const client = await CAClient.findById(filing.caClientId).select("fullName pan email").lean();
  const ca     = await User.findById(filing.preparedByCa).select("fullName caFirmName email").lean();

  const d   = filing.itr1Data || {};
  const tax = d.taxComputation || {};

  return {
    filingId:       filing._id,
    approvalStatus: filing.approvalStatus,
    assessmentYear: filing.assessmentYear,
    client: { fullName: client?.fullName, pan: client?.pan },
    ca:     { fullName: ca?.fullName, firmName: ca?.caFirmName },
    summary: {
      // Employer
      employerName:   d.employerName   || "",
      employerTAN:    d.employerTAN    || "",
      // Salary income
      grossSalary:    d.grossSalary    || 0,
      hraReceived:    d.hra_received   || 0,
      hraExempt:      d.hra_exempt     || 0,
      standardDeduction: d.selectedRegime === "new" ? 75000 : 50000,
      professionalTax: d.professionalTax || 0,
      // Other income
      interestIncome: d.interestIncome || 0,
      otherIncome:    d.otherIncome    || 0,
      // Deductions (Chapter VI-A) — only under old regime
      sec80C:         d.sec80C         || 0,
      sec80CCD1B:     d.sec80CCD1B     || 0,
      sec80D:         (d.sec80D_self || 0) + (d.sec80D_parents || 0),
      sec80TTA:       d.sec80TTA_TTB   || 0,
      sec80G:         d.sec80G         || 0,
      // Tax
      tdsDeducted:    d.tdsDeducted    || 0,
      selectedRegime: d.selectedRegime || "new",
      taxableIncome:  tax.taxableIncome || 0,
      totalTax:       tax.totalTax      || 0,
      effectiveRate:  tax.effectiveRate || 0,
      refundDue:      Math.max(0, (d.tdsDeducted || 0) - (tax.totalTax || 0)),
      balPayable:     Math.max(0, (tax.totalTax || 0) - (d.tdsDeducted || 0)),
      // Bank (last 4 digits only for security)
      bankLast4:      d.bankAccountNo ? String(d.bankAccountNo).slice(-4) : "",
      bankIFSC:       d.ifscCode || "",
    },
  };
};

// ── Public: client submits their decision ─────────────────────────────────────

export const respondToApproval = async (token, { action, comment }) => {
  const filing = await Filing.findOne({ approvalToken: token });
  if (!filing) throw Object.assign(new Error("Approval link is invalid or has expired"), { status: 404 });
  if (filing.approvalStatus !== "pending") {
    throw Object.assign(new Error("This approval request has already been responded to"), { status: 409 });
  }

  const status = action === "approve" ? "approved" : "rejected";
  await Filing.findByIdAndUpdate(filing._id, {
    $set: {
      approvalStatus:      status,
      approvalRespondedAt: new Date(),
      approvalComment:     comment || null,
    },
  });

  // Notify the CA
  const client = await CAClient.findById(filing.caClientId).select("fullName mobile").lean();
  const ca     = await User.findById(filing.preparedByCa).select("fullName email mobile").lean();

  if (ca?.email) {
    const template = approvalResponseEmail({ caName: ca.fullName, clientName: client?.fullName, status, comment });
    await sendMail({ to: ca.email, ...template });
  }
  if (ca?.mobile) {
    await sendSMS({ to: ca.mobile, body: approvalResponseSMS(client?.fullName, status) });
  }

  return { status, filingId: filing._id };
};
