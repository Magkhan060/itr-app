/**
 * SMS util — sendSMS provider resolution unit tests
 * axios mocked; verifies firm MSG91 override vs platform Twilio vs mock fallback.
 * Twilio credentials are left unset in env so the module never attempts the
 * real `twilio` package import.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const postMock = vi.fn().mockResolvedValue({ data: { type: "success" } });

vi.mock("axios", () => ({
  default: { post: postMock },
}));

vi.mock("../config/env.js", () => ({
  env: { twilioSid: null, twilioToken: null, twilioFrom: null },
}));

describe("sendSMS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls MSG91's HTTP API when firmSmsConfig.provider is msg91", async () => {
    const { sendSMS } = await import("./sms.util.js");

    await sendSMS({
      to: "9876543210",
      body: "Test message",
      firmSmsConfig: { provider: "msg91", apiKey: "key123", senderId: "ABCSND", route: "4" },
    });

    expect(postMock).toHaveBeenCalledWith(
      "https://api.msg91.com/api/v5/flow/",
      expect.objectContaining({ mobile: "919876543210", sender: "ABCSND", sms: "Test message" }),
      expect.objectContaining({ headers: expect.objectContaining({ authkey: "key123" }) })
    );
  });

  it("logs and returns a mock result when neither firm nor platform Twilio is configured", async () => {
    const { sendSMS } = await import("./sms.util.js");

    const result = await sendSMS({ to: "9876543210", body: "Test message" });

    expect(result).toEqual({ mock: true });
    expect(postMock).not.toHaveBeenCalled();
  });

  it("returns an error object instead of throwing when the MSG91 call fails", async () => {
    postMock.mockRejectedValueOnce(new Error("network down"));
    const { sendSMS } = await import("./sms.util.js");

    const result = await sendSMS({
      to: "9876543210",
      body: "Test message",
      firmSmsConfig: { provider: "msg91", apiKey: "key123", senderId: "ABCSND" },
    });

    expect(result).toEqual({ error: "network down" });
  });
});
