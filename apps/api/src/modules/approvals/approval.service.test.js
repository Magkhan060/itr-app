/**
 * Approval Service — unit tests
 * Covers: itrType-aware tax summary extraction in sendApprovalRequest, and
 * itrType-aware field selection + ITR-2 capital-gains/house-property summary
 * fields in getApprovalSummary.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../itr/filing.model.js", () => ({
  default: { findOne: vi.fn(), findByIdAndUpdate: vi.fn() },
}));
vi.mock("../ca/ca-client.model.js", () => ({
  default: { findById: vi.fn() },
}));
vi.mock("../auth/auth.model.js", () => ({
  default: { findById: vi.fn() },
}));
vi.mock("../ca/ca-firm.service.js", () => ({
  getFirmById: vi.fn().mockResolvedValue(null),
  getFirmCommsConfig: vi.fn().mockResolvedValue({ emailConfig: null, smsConfig: null }),
}));
vi.mock("../../utils/email.util.js", () => ({
  sendMail: vi.fn().mockResolvedValue({ mock: true }),
  approvalRequestEmail: vi.fn().mockReturnValue({ subject: "s", html: "h" }),
  approvalResponseEmail: vi.fn().mockReturnValue({ subject: "s", html: "h" }),
}));
vi.mock("../../utils/sms.util.js", () => ({
  sendSMS: vi.fn().mockResolvedValue({ mock: true }),
  approvalSMS: vi.fn().mockReturnValue("sms"),
  approvalResponseSMS: vi.fn().mockReturnValue("sms"),
}));
vi.mock("../../config/env.js", () => ({
  env: { appUrl: "http://localhost:5173" },
}));

import Filing from "../itr/filing.model.js";
import CAClient from "../ca/ca-client.model.js";
import User from "../auth/auth.model.js";
import { sendApprovalRequest, getApprovalSummary } from "./approval.service.js";

const select = (value) => ({ select: () => ({ lean: () => Promise.resolve(value) }) });

describe("sendApprovalRequest", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("reads tax summary from itr2Data when the filing is ITR-2, not itr1Data", async () => {
    Filing.findOne.mockResolvedValue({
      _id: "filing_1",
      status: "submitted",
      caClientId: "client_1",
      itrType: "ITR-2",
      itr1Data: null,
      itr2Data: { grossSalary: 800000, tdsDeducted: 60000, taxComputation: { totalTax: 70000 } },
    });
    CAClient.findById.mockResolvedValue({ fullName: "Client", email: "c@example.com", mobile: "9876543210" });
    User.findById.mockReturnValue(select({ fullName: "CA Name", caFirmId: null, email: "ca@example.com" }));
    Filing.findByIdAndUpdate.mockResolvedValue({});

    const { sendMail } = await import("../../utils/email.util.js");
    await sendApprovalRequest("ca_1", "filing_1");

    const callArgs = sendMail.mock.calls[0][0];
    expect(callArgs).toBeDefined();
    const { approvalRequestEmail } = await import("../../utils/email.util.js");
    const templateArgs = approvalRequestEmail.mock.calls[0][0];
    expect(templateArgs.taxSummary).toEqual({ grossSalary: 800000, totalTax: 70000, tdsDeducted: 60000 });
  });

  it("reads tax summary from itr1Data when the filing is ITR-1", async () => {
    Filing.findOne.mockResolvedValue({
      _id: "filing_2",
      status: "submitted",
      caClientId: "client_1",
      itrType: "ITR-1",
      itr1Data: { grossSalary: 500000, tdsDeducted: 30000, taxComputation: { totalTax: 25000 } },
      itr2Data: null,
    });
    CAClient.findById.mockResolvedValue({ fullName: "Client", email: "c@example.com", mobile: "9876543210" });
    User.findById.mockReturnValue(select({ fullName: "CA Name", caFirmId: null, email: "ca@example.com" }));
    Filing.findByIdAndUpdate.mockResolvedValue({});

    const { approvalRequestEmail } = await import("../../utils/email.util.js");
    await sendApprovalRequest("ca_1", "filing_2");

    const templateArgs = approvalRequestEmail.mock.calls[0][0];
    expect(templateArgs.taxSummary).toEqual({ grossSalary: 500000, totalTax: 25000, tdsDeducted: 30000 });
  });
});

describe("getApprovalSummary", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws 404 when the token does not resolve to a filing", async () => {
    Filing.findOne.mockReturnValue(select(null));

    await expect(getApprovalSummary("bad-token")).rejects.toMatchObject({ status: 404 });
  });

  it("returns itr1Data-derived fields and itrType ITR-1 for an ITR-1 filing", async () => {
    Filing.findOne.mockReturnValue(select({
      _id: "filing_1",
      itrType: "ITR-1",
      assessmentYear: "2026-27",
      approvalStatus: "pending",
      caClientId: "client_1",
      preparedByCa: "ca_1",
      itr1Data: { grossSalary: 500000, tdsDeducted: 30000, taxComputation: { totalTax: 25000, taxableIncome: 400000 } },
      itr2Data: null,
    }));
    CAClient.findById.mockReturnValue(select({ fullName: "Client", pan: "ABCDE1234F" }));
    User.findById.mockReturnValue(select({ fullName: "CA Name", caFirmId: null }));

    const result = await getApprovalSummary("tok");

    expect(result.itrType).toBe("ITR-1");
    expect(result.summary.grossSalary).toBe(500000);
    expect(result.summary).not.toHaveProperty("houseProperties");
    expect(result.summary).not.toHaveProperty("capitalGains");
  });

  it("returns itr2Data-derived fields plus house property/capital gains for an ITR-2 filing", async () => {
    Filing.findOne.mockReturnValue(select({
      _id: "filing_2",
      itrType: "ITR-2",
      assessmentYear: "2026-27",
      approvalStatus: "pending",
      caClientId: "client_1",
      preparedByCa: "ca_1",
      itr1Data: null,
      itr2Data: {
        grossSalary: 800000,
        tdsDeducted: 60000,
        houseProperties: [{ type: "let_out", annualRent: 240000 }],
        housePropertyNetIncome: 50000,
        taxComputation: {
          totalTax: 90000,
          taxableIncome: 700000,
          capitalGains: { stcg111A: 20000, ltcg112A: 0, stcgTax: 4000, ltcgTax: 0 },
        },
      },
    }));
    CAClient.findById.mockReturnValue(select({ fullName: "Client", pan: "ABCDE1234F" }));
    User.findById.mockReturnValue(select({ fullName: "CA Name", caFirmId: null }));

    const result = await getApprovalSummary("tok");

    expect(result.itrType).toBe("ITR-2");
    expect(result.summary.grossSalary).toBe(800000);
    expect(result.summary.houseProperties).toEqual([{ type: "let_out", annualRent: 240000 }]);
    expect(result.summary.housePropertyNetIncome).toBe(50000);
    expect(result.summary.capitalGains).toEqual({ stcg111A: 20000, ltcg112A: 0, stcgTax: 4000, ltcgTax: 0 });
  });
});
