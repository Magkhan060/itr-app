/**
 * Admin Service — unit tests
 * Covers: role updates, activation/deactivation, self-guard protection,
 * audit log creation, and pagination.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../auth/auth.model.js", () => ({
  default: {
    findById:         vi.fn(),
    findByIdAndUpdate: vi.fn(),
    find:             vi.fn(),
    countDocuments:   vi.fn(),
  },
}));
vi.mock("../documents/documents.model.js", () => ({
  default: { countDocuments: vi.fn() },
}));
vi.mock("./audit.model.js", () => ({
  default: { create: vi.fn(), find: vi.fn(), countDocuments: vi.fn() },
}));

import User     from "../auth/auth.model.js";
import Document from "../documents/documents.model.js";
import AuditLog from "./audit.model.js";

import {
  updateUserRole,
  toggleUserActive,
  getAuditLogs,
  getDashboardStats,
} from "./admin.service.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_ID  = "admin_000";
const TARGET_ID = "user_111";

const makeUserResult = (overrides = {}) => ({
  _id:      TARGET_ID,
  fullName: "Test User",
  pan:      "ZZZZZ9999Z",
  email:    "target@example.com",
  role:     "user",
  isActive: true,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// updateUserRole
// ─────────────────────────────────────────────────────────────────────────────

describe("updateUserRole", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("updates role and creates an audit log entry", async () => {
    // admin.service.js: User.findById(userId).select("role").lean()
    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ role: "user" }) }),
    });
    // admin.service.js: User.findByIdAndUpdate(...).select(...)
    User.findByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(makeUserResult({ role: "admin" })),
    });
    AuditLog.create.mockResolvedValue({});

    const result = await updateUserRole(TARGET_ID, "admin", ADMIN_ID);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      TARGET_ID,
      { $set: { role: "admin" } },
      { new: true }
    );
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId:  ADMIN_ID,
        action:   "ROLE_CHANGE",
        targetId: TARGET_ID,
        before:   { role: "user"  },
        after:    { role: "admin" },
      })
    );
    expect(result.role).toBe("admin");
  });

  it("throws 400 when admin tries to change their own role", async () => {
    await expect(updateUserRole(ADMIN_ID, "user", ADMIN_ID))
      .rejects.toMatchObject({ status: 400, message: "Cannot change your own role" });

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("throws 404 when target user does not exist (findByIdAndUpdate returns null)", async () => {
    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ role: "user" }) }),
    });
    User.findByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    await expect(updateUserRole("nonexistent", "admin", ADMIN_ID))
      .rejects.toMatchObject({ status: 404, message: "User not found" });
  });

  it("records correct before/after state when demoting admin to user", async () => {
    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ role: "admin" }) }),
    });
    User.findByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(makeUserResult({ role: "user" })),
    });
    AuditLog.create.mockResolvedValue({});

    await updateUserRole(TARGET_ID, "user", ADMIN_ID);

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ before: { role: "admin" }, after: { role: "user" } })
    );
  });

  it.each(["ca_admin", "ca_staff", "ca_readonly"])(
    "throws 400 when target user's current role is %s (CA roles managed via CA Portal)",
    async (caRole) => {
      User.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ role: caRole }) }),
      });

      await expect(updateUserRole(TARGET_ID, "taxpayer", ADMIN_ID))
        .rejects.toMatchObject({ status: 400 });

      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(AuditLog.create).not.toHaveBeenCalled();
    }
  );

  it("throws 404 when target user does not exist (User.findById returns null)", async () => {
    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    });

    await expect(updateUserRole("nonexistent", "taxpayer", ADMIN_ID))
      .rejects.toMatchObject({ status: 404, message: "User not found" });

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toggleUserActive
// ─────────────────────────────────────────────────────────────────────────────

describe("toggleUserActive", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("deactivates a user and creates USER_DEACTIVATED audit entry", async () => {
    User.findByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(makeUserResult({ isActive: false })),
    });
    AuditLog.create.mockResolvedValue({});

    await toggleUserActive(TARGET_ID, false, ADMIN_ID);

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_DEACTIVATED",
        before: { isActive: true  },   // !isActive = !false = true
        after:  { isActive: false },
      })
    );
  });

  it("activates a user and creates USER_ACTIVATED audit entry", async () => {
    User.findByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(makeUserResult({ isActive: true })),
    });
    AuditLog.create.mockResolvedValue({});

    await toggleUserActive(TARGET_ID, true, ADMIN_ID);

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_ACTIVATED",
        before: { isActive: false },  // !isActive = !true = false
        after:  { isActive: true  },
      })
    );
  });

  it("throws 400 when admin tries to deactivate themselves", async () => {
    await expect(toggleUserActive(ADMIN_ID, false, ADMIN_ID))
      .rejects.toMatchObject({ status: 400, message: "Cannot deactivate yourself" });

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("throws 400 when admin tries to activate themselves (guard is unconditional)", async () => {
    await expect(toggleUserActive(ADMIN_ID, true, ADMIN_ID))
      .rejects.toMatchObject({ status: 400 });

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("throws 404 when target user does not exist", async () => {
    User.findByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    await expect(toggleUserActive("ghost_id", false, ADMIN_ID))
      .rejects.toMatchObject({ status: 404, message: "User not found" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAuditLogs
// ─────────────────────────────────────────────────────────────────────────────

describe("getAuditLogs", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns paginated logs and total count", async () => {
    const fakeLogs = [{ _id: "log1", action: "ROLE_CHANGE" }];
    AuditLog.find.mockReturnValue({
      sort:     vi.fn().mockReturnThis(),
      skip:     vi.fn().mockReturnThis(),
      limit:    vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean:     vi.fn().mockResolvedValue(fakeLogs),
    });
    AuditLog.countDocuments.mockResolvedValue(1);

    const result = await getAuditLogs({ page: 1, limit: 50 });

    expect(result.logs).toEqual(fakeLogs);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it("calculates correct skip offset for page 2", async () => {
    const skipFn = vi.fn().mockReturnThis();
    AuditLog.find.mockReturnValue({
      sort:     vi.fn().mockReturnThis(),
      skip:     skipFn,
      limit:    vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean:     vi.fn().mockResolvedValue([]),
    });
    AuditLog.countDocuments.mockResolvedValue(0);

    await getAuditLogs({ page: 2, limit: 50 });

    expect(skipFn).toHaveBeenCalledWith(50); // (page-1) * limit = 1 * 50
  });

  it("populates adminId field with name + pan + email", async () => {
    const populateFn = vi.fn().mockReturnThis();
    AuditLog.find.mockReturnValue({
      sort:     vi.fn().mockReturnThis(),
      skip:     vi.fn().mockReturnThis(),
      limit:    vi.fn().mockReturnThis(),
      populate: populateFn,
      lean:     vi.fn().mockResolvedValue([]),
    });
    AuditLog.countDocuments.mockResolvedValue(0);

    await getAuditLogs({ page: 1, limit: 50 });

    expect(populateFn).toHaveBeenCalledWith("adminId", "fullName pan email");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDashboardStats
// ─────────────────────────────────────────────────────────────────────────────

describe("getDashboardStats", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns platform-management stats only — no filing content", async () => {
    User.countDocuments.mockResolvedValue(42);
    Document.countDocuments.mockResolvedValue(25);

    User.find.mockReturnValue({
      sort:   vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean:   vi.fn().mockResolvedValue([]),
    });

    const stats = await getDashboardStats();

    expect(stats.totalUsers).toBe(42);
    expect(stats.totalDocs).toBe(25);
    expect(stats.recentUsers).toEqual([]);
    expect(stats).not.toHaveProperty("totalFilings");
    expect(stats).not.toHaveProperty("filingsByStatus");
  });
});
