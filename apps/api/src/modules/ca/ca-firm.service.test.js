/**
 * CA Firm Service — getFirmCommsConfig unit tests
 * Mongoose / encryption mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./ca-firm.model.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../auth/auth.model.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../../utils/encryption.js", () => ({
  decrypt: vi.fn((hash) => hash.replace("ENC:", "")),
  encrypt: vi.fn((text) => `ENC:${text}`),
}));

import CAFirm from "./ca-firm.model.js";
import { getFirmCommsConfig } from "./ca-firm.service.js";

const select = (value) => ({ lean: () => Promise.resolve(value) });

describe("getFirmCommsConfig", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns null configs when firmId is falsy", async () => {
    const result = await getFirmCommsConfig(null);
    expect(result).toEqual({ emailConfig: null, smsConfig: null });
    expect(CAFirm.findById).not.toHaveBeenCalled();
  });

  it("returns null configs when firm does not exist", async () => {
    CAFirm.findById.mockReturnValue({ select: () => select(null) });

    const result = await getFirmCommsConfig("firm_1");
    expect(result).toEqual({ emailConfig: null, smsConfig: null });
  });

  it("returns null configs when firm has not opted into custom providers", async () => {
    CAFirm.findById.mockReturnValue({
      select: () => select({
        emailProvider: "platform", emailConfigEncrypted: null,
        smsProvider: "platform", smsConfigEncrypted: null,
      }),
    });

    const result = await getFirmCommsConfig("firm_1");
    expect(result).toEqual({ emailConfig: null, smsConfig: null });
  });

  it("decrypts and returns the firm's custom SMTP config", async () => {
    const stored = JSON.stringify({ host: "smtp.zoho.com", port: 587, user: "a@b.com", pass: "secret", fromAddress: "a@b.com" });
    CAFirm.findById.mockReturnValue({
      select: () => select({
        emailProvider: "smtp", emailConfigEncrypted: `ENC:${stored}`,
        smsProvider: "platform", smsConfigEncrypted: null,
      }),
    });

    const result = await getFirmCommsConfig("firm_1");
    expect(result.emailConfig).toMatchObject({ host: "smtp.zoho.com", port: 587, provider: "smtp" });
    expect(result.smsConfig).toBeNull();
  });

  it("decrypts and returns the firm's custom MSG91 config", async () => {
    const stored = JSON.stringify({ apiKey: "key123", senderId: "ABCSND" });
    CAFirm.findById.mockReturnValue({
      select: () => select({
        emailProvider: "platform", emailConfigEncrypted: null,
        smsProvider: "msg91", smsConfigEncrypted: `ENC:${stored}`,
      }),
    });

    const result = await getFirmCommsConfig("firm_1");
    expect(result.emailConfig).toBeNull();
    expect(result.smsConfig).toMatchObject({ apiKey: "key123", senderId: "ABCSND", provider: "msg91" });
  });

  it("ignores a stale emailConfigEncrypted blob when provider was reverted to platform", async () => {
    CAFirm.findById.mockReturnValue({
      select: () => select({
        emailProvider: "platform", emailConfigEncrypted: `ENC:${JSON.stringify({ host: "stale" })}`,
        smsProvider: "platform", smsConfigEncrypted: null,
      }),
    });

    const result = await getFirmCommsConfig("firm_1");
    expect(result.emailConfig).toBeNull();
  });
});
