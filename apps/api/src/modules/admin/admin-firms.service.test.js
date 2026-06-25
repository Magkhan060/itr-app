/**
 * Admin Firms Service — unit tests
 * Covers: paginated/search firm listing with per-firm stats, firm detail
 * (admin + team roster), and activate/deactivate cascade + audit logging.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../auth/auth.model.js", () => ({
  default: {
    countDocuments: vi.fn(),
    updateMany:     vi.fn(),
    find:           vi.fn(),
  },
}));
vi.mock("../ca/ca-firm.model.js", () => ({
  default: {
    find:              vi.fn(),
    countDocuments:    vi.fn(),
    findById:          vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));
vi.mock("../ca/ca-client.model.js", () => ({
  default: { countDocuments: vi.fn() },
}));
vi.mock("../itr/filing.model.js", () => ({
  default: { countDocuments: vi.fn() },
}));
vi.mock("./audit.model.js", () => ({
  default: { create: vi.fn() },
}));

import User     from "../auth/auth.model.js";
import CAFirm   from "../ca/ca-firm.model.js";
import CAClient from "../ca/ca-client.model.js";
import Filing   from "../itr/filing.model.js";
import AuditLog from "./audit.model.js";

import { getAllFirms, getFirmDetail, toggleFirmActive } from "./admin-firms.service.js";

const FIRM_ID  = "firm_111";
const ADMIN_USER_ID = "ca_admin_user_1";
const PLATFORM_ADMIN_ID = "platform_admin_1";

const makeFirm = (overrides = {}) => ({
  _id:       FIRM_ID,
  firmName:  "Kumar & Associates",
  icaiMemberNo: "ICAI12345",
  isActive:  true,
  adminUserId: { _id: ADMIN_USER_ID, fullName: "Rajesh Kumar", email: "rajesh@firm.com", mobile: "9876543210" },
  ...overrides,
});

describe("getAllFirms", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns paginated firms enriched with client/filing/member stats", async () => {
    CAFirm.find.mockReturnValue({
      sort:     vi.fn().mockReturnThis(),
      skip:     vi.fn().mockReturnThis(),
      limit:    vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean:     vi.fn().mockResolvedValue([makeFirm()]),
    });
    CAFirm.countDocuments.mockResolvedValue(1);
    CAClient.countDocuments.mockResolvedValue(5);
    Filing.countDocuments.mockResolvedValue(3);
    User.countDocuments.mockResolvedValue(2);

    const result = await getAllFirms({ page: 1, limit: 20, search: "" });

    expect(result.total).toBe(1);
    expect(result.firms).toHaveLength(1);
    expect(result.firms[0]).toMatchObject({ clientCount: 5, filingCount: 3, memberCount: 2 });
  });

  it("scopes client/filing counts to the firm admin's userId, not the firm's own _id", async () => {
    CAFirm.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([makeFirm()]),
    });
    CAFirm.countDocuments.mockResolvedValue(1);
    CAClient.countDocuments.mockResolvedValue(0);
    Filing.countDocuments.mockResolvedValue(0);
    User.countDocuments.mockResolvedValue(0);

    await getAllFirms({ page: 1, limit: 20, search: "" });

    expect(CAClient.countDocuments).toHaveBeenCalledWith({ caId: ADMIN_USER_ID, isActive: true });
    expect(Filing.countDocuments).toHaveBeenCalledWith({ userId: ADMIN_USER_ID, caClientId: { $ne: null } });
    expect(User.countDocuments).toHaveBeenCalledWith({ caFirmId: FIRM_ID });
  });

  it("builds a case-insensitive regex search across firmName and icaiMemberNo", async () => {
    const findFn = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    CAFirm.find = findFn;
    CAFirm.countDocuments.mockResolvedValue(0);

    await getAllFirms({ page: 1, limit: 20, search: "kumar" });

    expect(findFn).toHaveBeenCalledWith({
      $or: [
        { firmName:     { $regex: "kumar", $options: "i" } },
        { icaiMemberNo: { $regex: "kumar", $options: "i" } },
      ],
    });
  });
});

describe("getFirmDetail", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws 404 when firm does not exist", async () => {
    CAFirm.findById.mockReturnValue({ populate: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(null) });

    await expect(getFirmDetail("ghost")).rejects.toMatchObject({ status: 404, message: "Firm not found" });
  });

  it("returns the firm with stats and team member roster", async () => {
    CAFirm.findById.mockReturnValue({ populate: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(makeFirm()) });
    CAClient.countDocuments.mockResolvedValue(4);
    Filing.countDocuments.mockResolvedValue(2);
    User.countDocuments.mockResolvedValue(3);
    const members = [{ _id: "u1", fullName: "Staff One", role: "ca_staff", isActive: true }];
    User.find.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort:   vi.fn().mockReturnThis(),
      lean:   vi.fn().mockResolvedValue(members),
    });

    const result = await getFirmDetail(FIRM_ID);

    expect(result.clientCount).toBe(4);
    expect(result.filingCount).toBe(2);
    expect(result.memberCount).toBe(3);
    expect(result.members).toEqual(members);
  });
});

describe("toggleFirmActive", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("deactivates the firm, blocks all its users, and logs FIRM_DEACTIVATED", async () => {
    CAFirm.findByIdAndUpdate.mockResolvedValue(makeFirm({ isActive: false }));
    User.updateMany.mockResolvedValue({});
    AuditLog.create.mockResolvedValue({});
    CAFirm.findById.mockReturnValue({ populate: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(makeFirm({ isActive: false })) });
    CAClient.countDocuments.mockResolvedValue(0);
    Filing.countDocuments.mockResolvedValue(0);
    User.countDocuments.mockResolvedValue(0);
    User.find.mockReturnValue({ select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) });

    await toggleFirmActive(FIRM_ID, false, PLATFORM_ADMIN_ID);

    expect(CAFirm.findByIdAndUpdate).toHaveBeenCalledWith(FIRM_ID, { $set: { isActive: false } }, { new: true });
    expect(User.updateMany).toHaveBeenCalledWith({ caFirmId: FIRM_ID }, { $set: { isActive: false } });
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId:  PLATFORM_ADMIN_ID,
        action:   "FIRM_DEACTIVATED",
        targetId: FIRM_ID,
        before:   { isActive: true },
        after:    { isActive: false },
      })
    );
  });

  it("reactivates the firm and restores all its users", async () => {
    CAFirm.findByIdAndUpdate.mockResolvedValue(makeFirm({ isActive: true }));
    User.updateMany.mockResolvedValue({});
    AuditLog.create.mockResolvedValue({});
    CAFirm.findById.mockReturnValue({ populate: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(makeFirm({ isActive: true })) });
    CAClient.countDocuments.mockResolvedValue(0);
    Filing.countDocuments.mockResolvedValue(0);
    User.countDocuments.mockResolvedValue(0);
    User.find.mockReturnValue({ select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) });

    await toggleFirmActive(FIRM_ID, true, PLATFORM_ADMIN_ID);

    expect(User.updateMany).toHaveBeenCalledWith({ caFirmId: FIRM_ID }, { $set: { isActive: true } });
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "FIRM_ACTIVATED" }));
  });

  it("throws 404 when firm does not exist", async () => {
    CAFirm.findByIdAndUpdate.mockResolvedValue(null);

    await expect(toggleFirmActive("ghost", false, PLATFORM_ADMIN_ID))
      .rejects.toMatchObject({ status: 404, message: "Firm not found" });

    expect(User.updateMany).not.toHaveBeenCalled();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });
});
