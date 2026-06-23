/**
 * Client Portal Service — unit tests
 * Verifies the caClientId-based ownership check that replaces the normal
 * userId-based check used for self-filed returns.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../auth/auth.model.js", () => ({
  default: { findById: vi.fn() },
}));

vi.mock("../itr/filing.model.js", () => ({
  default: { find: vi.fn(), findOne: vi.fn() },
}));

vi.mock("../../utils/encryption.js", () => ({
  decrypt: vi.fn().mockReturnValue("decrypted-value"),
}));

vi.mock("../efiling/xml-generator.js", () => ({
  generateITR1XML: vi.fn().mockReturnValue("<xml>mock</xml>"),
  generateITR2XML: vi.fn().mockReturnValue("<xml>mock-itr2</xml>"),
}));

vi.mock("../itr/refund.service.js", () => ({
  computeRefundStatus: vi.fn().mockReturnValue({ applicable: true, refundAmount: 5000 }),
}));

import User from "../auth/auth.model.js";
import Filing from "../itr/filing.model.js";
import {
  getLinkedClientId,
  getPortalFilings,
  getPortalFilingById,
  getPortalFilingXML,
  getPortalRefundStatus,
} from "./client-portal.service.js";

describe("getLinkedClientId", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws 403 when the account has no linkedCAClientId", async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ linkedCAClientId: null }) }) });

    await expect(getLinkedClientId("user_1")).rejects.toMatchObject({ status: 403 });
  });

  it("returns the linked client id when present", async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ linkedCAClientId: "client_1" }) }) });

    await expect(getLinkedClientId("user_1")).resolves.toBe("client_1");
  });
});

describe("getPortalFilings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("queries by caClientId, not userId", async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ linkedCAClientId: "client_1" }) }) });
    const sortMock = vi.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ _id: "f1" }]) }) });
    Filing.find.mockReturnValue({ sort: sortMock });

    const result = await getPortalFilings("user_1");

    expect(Filing.find).toHaveBeenCalledWith({ caClientId: "client_1" });
    expect(result).toEqual([{ _id: "f1" }]);
  });
});

describe("ownership check (shared by getPortalFilingById / XML / refund)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects a filing that belongs to a different caClientId", async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ linkedCAClientId: "client_1" }) }) });
    // Filing.findOne({ _id, caClientId: "client_1" }) returns null because the
    // filing actually belongs to a different client — simulating the DB
    // query itself filtering it out.
    Filing.findOne.mockResolvedValue(null);

    await expect(getPortalFilingById("user_1", "filing_99")).rejects.toMatchObject({ status: 404 });
    expect(Filing.findOne).toHaveBeenCalledWith({ _id: "filing_99", caClientId: "client_1" });
  });

  it("returns the filing when caClientId matches", async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ linkedCAClientId: "client_1" }) }) });
    const filingDoc = { toObject: () => ({ _id: "filing_1", caClientId: "client_1", itr1Data: {} }) };
    Filing.findOne.mockResolvedValue(filingDoc);

    const result = await getPortalFilingById("user_1", "filing_1");
    expect(result).toEqual({ _id: "filing_1", caClientId: "client_1", itr1Data: {} });
  });

  it("generates XML only after the ownership check passes", async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ linkedCAClientId: "client_1" }) }) });
    const filingDoc = { toObject: () => ({ _id: "filing_1", caClientId: "client_1", itr1Data: { bankAccountEncrypted: "enc" } }) };
    Filing.findOne.mockResolvedValue(filingDoc);

    const { generateITR1XML } = await import("../efiling/xml-generator.js");
    const xml = await getPortalFilingXML("user_1", "filing_1");

    expect(xml).toBe("<xml>mock</xml>");
    expect(generateITR1XML).toHaveBeenCalledOnce();
  });

  it("computes refund status only after the ownership check passes", async () => {
    User.findById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ linkedCAClientId: "client_1" }) }) });
    const filingDoc = { toObject: () => ({ _id: "filing_1", caClientId: "client_1" }) };
    Filing.findOne.mockResolvedValue(filingDoc);

    const result = await getPortalRefundStatus("user_1", "filing_1");
    expect(result).toEqual({ applicable: true, refundAmount: 5000 });
  });
});
