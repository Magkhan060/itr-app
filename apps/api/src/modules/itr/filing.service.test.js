/**
 * Filing Service — unit tests
 * Covers: CA-prepared draft saving (itrType-aware data field selection) and
 * CA-prepared ITR-2 submission (tax recomputation + filing upsert shape).
 * Mongoose, encryption, and the tax engine are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./filing.model.js", () => ({
  default: { findOneAndUpdate: vi.fn(), findOne: vi.fn() },
}));

vi.mock("../../utils/encryption.js", () => ({
  encrypt: vi.fn((text) => `ENC:${text}`),
  decrypt: vi.fn((hash) => hash.replace("ENC:", "")),
}));

vi.mock("../tax-engine/engine.service.js", () => ({
  compareRegimes: vi.fn(),
  compareRegimesWithCapitalGains: vi.fn(),
}));

vi.mock("./refund.service.js", () => ({
  computeRefundStatus: vi.fn(),
}));

vi.mock("@itr-app/shared-types", () => ({
  CURRENT_AY: "2026-27",
  DEDUCTION_LIMITS: {},
}));

import Filing from "./filing.model.js";
import { compareRegimesWithCapitalGains } from "../tax-engine/engine.service.js";
import { computeRefundStatus } from "./refund.service.js";
import { saveDraftForClient, submitITR2ForClient, getClientFilingRefund } from "./filing.service.js";

const CA_ID     = "ca_admin_1";
const CLIENT_ID = "client_1";

const makeFilingDoc = (overrides = {}) => ({
  _id: "filing_1",
  toObject() { return { ...this }; },
  itr1Data: null,
  itr2Data: null,
  ...overrides,
});

describe("saveDraftForClient", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("stores the draft under itr1Data when itrType is ITR-1", async () => {
    Filing.findOneAndUpdate.mockResolvedValue(makeFilingDoc({ itr1Data: { foo: "bar" } }));

    await saveDraftForClient(CA_ID, CLIENT_ID, { itrType: "ITR-1", assessmentYear: "2026-27", step: 0, data: { foo: "bar" } });

    expect(Filing.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: CA_ID, caClientId: CLIENT_ID, itrType: "ITR-1", assessmentYear: "2026-27" },
      expect.objectContaining({ $set: expect.objectContaining({ itr1Data: { foo: "bar" } }) }),
      expect.any(Object)
    );
  });

  it("stores the draft under itr2Data when itrType is ITR-2 — not itr1Data", async () => {
    Filing.findOneAndUpdate.mockResolvedValue(makeFilingDoc({ itr2Data: { foo: "bar" } }));

    await saveDraftForClient(CA_ID, CLIENT_ID, { itrType: "ITR-2", assessmentYear: "2026-27", step: 2, data: { foo: "bar" } });

    const [, update] = Filing.findOneAndUpdate.mock.calls[0];
    expect(update.$set).toHaveProperty("itr2Data");
    expect(update.$set).not.toHaveProperty("itr1Data");
  });

  it("sets preparedByCa and caClientId on the upsert", async () => {
    Filing.findOneAndUpdate.mockResolvedValue(makeFilingDoc());

    await saveDraftForClient(CA_ID, CLIENT_ID, { itrType: "ITR-2", assessmentYear: "2026-27", step: 0, data: {} }, "acting_staff_user");

    const [, update] = Filing.findOneAndUpdate.mock.calls[0];
    expect(update.$set.preparedByCa).toBe("acting_staff_user");
    expect(update.$set.caClientId).toBe(CLIENT_ID);
    expect(update.$set.status).toBe("draft");
  });
});

describe("submitITR2ForClient", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const basePayload = {
    personalInfo: { fullName: "Rajesh Kumar", pan: "ABCDE1234F", dateOfBirth: "1990-01-01" },
    incomeDetails: { basicSalary: 600000, hra_received: 100000, specialAllowance: 50000, bonus: 0, tdsDeducted: 40000, interestIncome: 5000, otherIncome: 0 },
    houseProperties: [{ type: "let_out", annualRent: 240000, municipalTax: 10000, interestOnLoan: 50000 }],
    capitalGains: { stcg111A: 20000, ltcg112A: 0 },
    deductions: { sec80C: 50000, sec80CCD1B: 0, sec80D_self: 0, sec80D_parents: 0, hra_exempt: 0, lta: 0, sec80TTA_TTB: 0, sec80G: 0 },
    selectedRegime: "new",
  };

  it("recomputes tax via compareRegimesWithCapitalGains and stores under itr2Data with itrType ITR-2", async () => {
    compareRegimesWithCapitalGains.mockReturnValue({
      old: { totalTax: 50000 },
      new: { totalTax: 40000 },
    });
    Filing.findOneAndUpdate.mockResolvedValue(makeFilingDoc({ itr2Data: {} }));

    const result = await submitITR2ForClient(CA_ID, CLIENT_ID, basePayload, "acting_admin_user");

    expect(compareRegimesWithCapitalGains).toHaveBeenCalledOnce();
    expect(Filing.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: CA_ID, caClientId: CLIENT_ID, itrType: "ITR-2", assessmentYear: "2026-27" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "submitted",
          preparedByCa: "acting_admin_user",
          caClientId: CLIENT_ID,
          approvalStatus: "not_sent",
        }),
      }),
      expect.any(Object)
    );
    expect(result.acknowledgementNo).toMatch(/^ITR2CA/);
    expect(result.taxSummary.totalTax).toBe(40000);
  });

  it("does not set itr1Data on the update — only itr2Data", async () => {
    compareRegimesWithCapitalGains.mockReturnValue({ old: { totalTax: 1 }, new: { totalTax: 1 } });
    Filing.findOneAndUpdate.mockResolvedValue(makeFilingDoc());

    await submitITR2ForClient(CA_ID, CLIENT_ID, basePayload);

    const [, update] = Filing.findOneAndUpdate.mock.calls[0];
    expect(update.$set).toHaveProperty("itr2Data");
    expect(update.$set).not.toHaveProperty("itr1Data");
  });

  it("passes the self-occupied interest split into deductions.homeLoanInterest, not otherIncome", async () => {
    compareRegimesWithCapitalGains.mockReturnValue({ old: { totalTax: 1 }, new: { totalTax: 1 } });
    Filing.findOneAndUpdate.mockResolvedValue(makeFilingDoc());

    const payload = {
      ...basePayload,
      houseProperties: [{ type: "self_occupied", interestOnLoan: 180000 }],
    };
    await submitITR2ForClient(CA_ID, CLIENT_ID, payload);

    const engineArgs = compareRegimesWithCapitalGains.mock.calls[0][0];
    expect(engineArgs.deductions.homeLoanInterest).toBe(180000);
  });
});

describe("getClientFilingRefund", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns computeRefundStatus's result for a filing owned by this CA and client", async () => {
    const filing = makeFilingDoc({ _id: "filing_1", status: "submitted" });
    Filing.findOne.mockResolvedValue(filing);
    computeRefundStatus.mockReturnValue({ applicable: true, refundAmount: 5000 });

    const result = await getClientFilingRefund(CA_ID, CLIENT_ID, "filing_1");

    expect(Filing.findOne).toHaveBeenCalledWith({ _id: "filing_1", userId: CA_ID, caClientId: CLIENT_ID });
    expect(computeRefundStatus).toHaveBeenCalledWith(filing);
    expect(result).toEqual({ applicable: true, refundAmount: 5000 });
  });

  it("throws 404 when the filing does not belong to this CA/client combination", async () => {
    Filing.findOne.mockResolvedValue(null);

    await expect(getClientFilingRefund(CA_ID, CLIENT_ID, "filing_999"))
      .rejects.toMatchObject({ status: 404, message: "Filing not found" });

    expect(computeRefundStatus).not.toHaveBeenCalled();
  });
});
