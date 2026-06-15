/**
 * Feature Flag Middleware — unit tests
 * Tests: enabled flag → next(), disabled/missing → 403, in-process cache,
 * and DB error propagation.
 *
 * Each test isolates its own module instance to avoid cache bleed-through.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock for FeatureFlag model ─────────────────────────────────────────
const mockLean   = vi.fn();
const mockSelect = vi.fn().mockReturnValue({ lean: mockLean });
const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock("../modules/features/features.model.js", () => ({
  default: { findOne: mockFindOne },
}));

vi.mock("../utils/response.util.js", () => ({
  error: vi.fn((res, msg, status, code) => {
    res._status = status;
    res._body   = { success: false, error: msg, code };
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeRes = () => ({
  _status: null, _body: null,
  status:  vi.fn().mockReturnThis(),
  json:    vi.fn().mockReturnThis(),
});

const makeReq = () => ({ userId: "admin_id" });

// Fresh module import that bypasses module cache so each test has an empty TTL cache
const freshRequireFeature = async () => {
  vi.resetModules();
  // Re-mock after reset
  vi.mock("../modules/features/features.model.js", () => ({
    default: { findOne: mockFindOne },
  }));
  vi.mock("../utils/response.util.js", () => ({
    error: vi.fn((res, msg, status, code) => {
      res._status = status;
      res._body   = { success: false, error: msg, code };
    }),
  }));
  const mod = await import("./featureFlag.middleware.js");
  return mod.requireFeature;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("requireFeature middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the chain stubs
    mockLean.mockReset();
    mockSelect.mockReset().mockReturnValue({ lean: mockLean });
    mockFindOne.mockReset().mockReturnValue({ select: mockSelect });
  });

  it("calls next() when the flag is enabled in DB", async () => {
    mockLean.mockResolvedValue({ enabled: true });
    const requireFeature = await freshRequireFeature();

    const next = vi.fn();
    await requireFeature("ITR_1")(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // no error argument
  });

  it("returns 403 FEATURE_DISABLED when flag is disabled", async () => {
    mockLean.mockResolvedValue({ enabled: false });
    const requireFeature = await freshRequireFeature();

    const res  = makeRes();
    const next = vi.fn();
    await requireFeature("ITR_2")(makeReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._body?.code).toBe("FEATURE_DISABLED");
  });

  it("returns 403 when flag is not found in DB (null response)", async () => {
    mockLean.mockResolvedValue(null); // flag not seeded
    const requireFeature = await freshRequireFeature();

    const res  = makeRes();
    const next = vi.fn();
    await requireFeature("UNKNOWN_FLAG")(makeReq(), res, next);

    expect(res._status).toBe(403);
    expect(res._body?.code).toBe("FEATURE_DISABLED");
  });

  it("uppercases the flag key before querying DB", async () => {
    mockLean.mockResolvedValue({ enabled: true });
    const requireFeature = await freshRequireFeature();

    await requireFeature("itr_1")(makeReq(), makeRes(), vi.fn());

    expect(mockFindOne).toHaveBeenCalledWith({ key: "ITR_1" });
  });

  it("calls next(err) when DB throws an error", async () => {
    const dbError = new Error("MongoDB connection timeout");
    mockLean.mockRejectedValue(dbError);
    const requireFeature = await freshRequireFeature();

    const next = vi.fn();
    await requireFeature("ITR_1")(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledWith(dbError);
  });

  it("caches the result — only 1 DB call for 2 requests with same flag key within TTL", async () => {
    mockLean.mockResolvedValue({ enabled: true });
    const requireFeature = await freshRequireFeature();

    const next = vi.fn();
    // Two successive calls with the same key
    await requireFeature("ITR_1")(makeReq(), makeRes(), next);
    await requireFeature("ITR_1")(makeReq(), makeRes(), next);

    // DB hit only once; second call served from in-process cache
    expect(mockFindOne).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("makes a separate DB call for different flag keys", async () => {
    mockLean.mockResolvedValue({ enabled: true });
    const requireFeature = await freshRequireFeature();

    const next = vi.fn();
    await requireFeature("ITR_1")(makeReq(), makeRes(), next);
    await requireFeature("ITR_2")(makeReq(), makeRes(), next);

    expect(mockFindOne).toHaveBeenCalledTimes(2);
  });
});
