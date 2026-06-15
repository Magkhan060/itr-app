/**
 * Encryption utility — unit tests
 * AES-256-CBC encrypt/decrypt with a fixed test key.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

// Provide a deterministic 32-byte hex key (64 hex chars) before the module loads.
vi.mock("../config/env.js", () => ({
  env: {
    encryptionKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    jwtSecret:     "test-jwt-secret",
    jwtExpiresIn:  "7d",
    port:          5000,
    nodeEnv:       "test",
  },
}));

const { encrypt, decrypt } = await import("./encryption.js");

describe("encrypt / decrypt", () => {
  it("round-trips a plain string", () => {
    const original = "Hello, World!";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("round-trips a bank account number", () => {
    const acct = "123456789012";
    expect(decrypt(encrypt(acct))).toBe(acct);
  });

  it("round-trips a string containing special characters", () => {
    const s = "₹ 1,23,456 / AB#@CD";
    expect(decrypt(encrypt(s))).toBe(s);
  });

  it("round-trips an empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("returns a non-empty colon-separated hex string (IV:ciphertext)", () => {
    const token = encrypt("test");
    expect(typeof token).toBe("string");
    const parts = token.split(":");
    expect(parts).toHaveLength(2);
    // IV = 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Ciphertext must be non-empty
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("produces a different ciphertext on every call (random IV)", () => {
    const plain = "same-input";
    const t1 = encrypt(plain);
    const t2 = encrypt(plain);
    expect(t1).not.toBe(t2);
    // But both must decrypt to the same value
    expect(decrypt(t1)).toBe(plain);
    expect(decrypt(t2)).toBe(plain);
  });

  it("converts numeric input to string and round-trips", () => {
    const num = 9876543210;
    const token = encrypt(num);   // encrypt calls String(text) internally
    expect(decrypt(token)).toBe(String(num));
  });

  it("throws when given a malformed token (missing colon)", () => {
    expect(() => decrypt("notavalidtoken")).toThrow();
  });
});
