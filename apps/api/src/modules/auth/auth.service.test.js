/**
 * Auth Service — unit tests
 * All Mongoose / JWT / bcrypt calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted before imports) ───────────────────────────────────────────

vi.mock("./auth.model.js", () => ({
  default: {
    findOne:    vi.fn(),
    create:     vi.fn(),
    findById:   vi.fn(),
  },
}));

vi.mock("../../config/env.js", () => ({
  env: {
    encryptionKey: "0".repeat(64),
    jwtSecret:     "test-secret",
    jwtExpiresIn:  "7d",
    port:          5000,
    nodeEnv:       "test",
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash:    vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock_jwt_token"),
  },
}));

import User from "./auth.model.js";
import bcrypt from "bcryptjs";
import { registerUser, loginUser, getUserById } from "./auth.service.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockSafeUser = {
  id:       "user_id_123",
  pan:      "ABCDE1234F",
  fullName: "Rajesh Kumar",
  email:    "rajesh@example.com",
  mobile:   "9876543210",
  role:     "user",
  isActive: true,
};

const makeUserDoc = (overrides = {}) => ({
  _id:          "user_id_123",
  pan:          "ABCDE1234F",
  email:        "rajesh@example.com",
  passwordHash: "hashed_password",
  isActive:     true,
  lastLogin:    null,
  save:         vi.fn().mockResolvedValue(true),
  toSafeObject: vi.fn().mockReturnValue(mockSafeUser),
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// registerUser
// ─────────────────────────────────────────────────────────────────────────────

describe("registerUser", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("creates a new user and returns token + safe user when PAN is unique", async () => {
    User.findOne.mockResolvedValue(null);           // no duplicate
    User.create.mockResolvedValue(makeUserDoc());

    const result = await registerUser({
      pan: "ABCDE1234F", fullName: "Rajesh Kumar",
      email: "rajesh@example.com", mobile: "9876543210", password: "P@ssw0rd",
    });

    expect(User.findOne).toHaveBeenCalledOnce();
    expect(bcrypt.hash).toHaveBeenCalledWith("P@ssw0rd", 12);
    expect(result).toHaveProperty("token", "mock_jwt_token");
    expect(result.user).toEqual(mockSafeUser);
  });

  it("throws 409 when PAN is already registered", async () => {
    User.findOne.mockResolvedValue(makeUserDoc({ pan: "ABCDE1234F" }));

    await expect(registerUser({
      pan: "ABCDE1234F", fullName: "Test", email: "other@example.com",
      mobile: "9999999999", password: "pass",
    })).rejects.toMatchObject({ status: 409, message: "PAN already registered" });
  });

  it("throws 409 with 'Email already registered' when email is duplicate", async () => {
    const existingUser = makeUserDoc({ pan: "ZZZZZ9999Z", email: "rajesh@example.com" });
    User.findOne.mockResolvedValue(existingUser);

    await expect(registerUser({
      pan: "XYZAB1234C", fullName: "Test", email: "rajesh@example.com",
      mobile: "9999999999", password: "pass",
    })).rejects.toMatchObject({ status: 409, message: "Email already registered" });
  });

  it("hashes the password with bcrypt cost factor 12", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(makeUserDoc());

    await registerUser({ pan: "ABCDE1234F", fullName: "T", email: "t@t.com", mobile: "9", password: "secret" });

    expect(bcrypt.hash).toHaveBeenCalledWith("secret", 12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loginUser
// ─────────────────────────────────────────────────────────────────────────────

describe("loginUser", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns token and user on successful login", async () => {
    const userDoc = makeUserDoc();
    User.findOne.mockResolvedValue(userDoc);
    bcrypt.compare.mockResolvedValue(true);

    const result = await loginUser({ pan: "ABCDE1234F", password: "P@ssw0rd" });

    expect(result.token).toBe("mock_jwt_token");
    expect(result.user).toEqual(mockSafeUser);
    expect(userDoc.save).toHaveBeenCalledOnce(); // lastLogin updated
  });

  it("throws 401 when PAN is not found in DB", async () => {
    User.findOne.mockResolvedValue(null);

    await expect(loginUser({ pan: "NOTEXIST12A", password: "wrong" }))
      .rejects.toMatchObject({ status: 401, message: "Invalid PAN or password" });
  });

  it("throws 401 when password does not match", async () => {
    User.findOne.mockResolvedValue(makeUserDoc());
    bcrypt.compare.mockResolvedValue(false); // wrong password

    await expect(loginUser({ pan: "ABCDE1234F", password: "wrong_password" }))
      .rejects.toMatchObject({ status: 401, message: "Invalid PAN or password" });
  });

  it("throws 403 when account is deactivated (isActive: false)", async () => {
    const inactiveUser = makeUserDoc({ isActive: false });
    User.findOne.mockResolvedValue(inactiveUser);
    bcrypt.compare.mockResolvedValue(true); // password is correct but account deactivated

    await expect(loginUser({ pan: "ABCDE1234F", password: "P@ssw0rd" }))
      .rejects.toMatchObject({ status: 403, message: "Account has been deactivated" });
  });

  it("does NOT generate a token for a deactivated account", async () => {
    const { default: jwt } = await import("jsonwebtoken");
    const inactiveUser = makeUserDoc({ isActive: false });
    User.findOne.mockResolvedValue(inactiveUser);
    bcrypt.compare.mockResolvedValue(true);

    await expect(loginUser({ pan: "ABCDE1234F", password: "P@ssw0rd" })).rejects.toThrow();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("updates lastLogin on successful authentication", async () => {
    const userDoc = makeUserDoc();
    User.findOne.mockResolvedValue(userDoc);
    bcrypt.compare.mockResolvedValue(true);

    await loginUser({ pan: "ABCDE1234F", password: "P@ssw0rd" });

    expect(userDoc.lastLogin).toBeInstanceOf(Date);
    expect(userDoc.save).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getUserById
// ─────────────────────────────────────────────────────────────────────────────

describe("getUserById", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns the safe user object when found", async () => {
    User.findById.mockResolvedValue(makeUserDoc());

    const result = await getUserById("user_id_123");
    expect(result).toEqual(mockSafeUser);
  });

  it("throws 404 when user is not found", async () => {
    User.findById.mockResolvedValue(null);

    await expect(getUserById("nonexistent_id"))
      .rejects.toMatchObject({ status: 404, message: "User not found" });
  });
});
