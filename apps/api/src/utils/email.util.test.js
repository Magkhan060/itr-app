/**
 * Email util — sendMail provider resolution unit tests
 * nodemailer mocked; verifies firm SMTP override vs platform Gmail vs mock fallback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMailMock = vi.fn().mockResolvedValue({ messageId: "1" });
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

describe("sendMail — platform Gmail configured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("uses the firm's custom SMTP config when firmEmailConfig is provided", async () => {
    vi.doMock("../config/env.js", () => ({
      env: { gmailUser: "platform@gmail.com", gmailPass: "pw" },
    }));
    const { sendMail } = await import("./email.util.js");

    await sendMail({
      to: "client@example.com",
      subject: "Hi",
      html: "<p>hi</p>",
      firmEmailConfig: { host: "smtp.zoho.com", port: 587, secure: false, user: "ca@firm.com", pass: "secret", fromAddress: "ca@firm.com", fromName: "Firm CA" },
    });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.zoho.com", port: 587, auth: { user: "ca@firm.com", pass: "secret" } })
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: '"Firm CA" <ca@firm.com>', to: "client@example.com" })
    );
  });

  it("falls back to the platform Gmail transport when no firmEmailConfig is given", async () => {
    vi.doMock("../config/env.js", () => ({
      env: { gmailUser: "platform@gmail.com", gmailPass: "pw" },
    }));
    const { sendMail } = await import("./email.util.js");

    await sendMail({ to: "client@example.com", subject: "Hi", html: "<p>hi</p>" });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: '"ITR Filing Portal" <platform@gmail.com>' })
    );
  });
});

describe("sendMail — no platform Gmail credentials (mock mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("logs and returns a mock result when neither firm nor platform config exists", async () => {
    vi.doMock("../config/env.js", () => ({ env: { gmailUser: null, gmailPass: null } }));
    const { sendMail } = await import("./email.util.js");

    const result = await sendMail({ to: "client@example.com", subject: "Hi", html: "<p>hi</p>" });

    expect(result).toEqual({ mock: true });
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
