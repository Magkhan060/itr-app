/**
 * Client Invite Service — unit tests
 * All Mongoose / JWT / bcrypt / email / SMS calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./ca-client.model.js", () => ({
  default: {
    findOne:   vi.fn(),
    findById:  vi.fn(),
  },
}));

vi.mock("./client-invite.model.js", () => ({
  default: {
    findOne:  vi.fn(),
    create:   vi.fn(),
  },
}));

vi.mock("../auth/auth.model.js", () => ({
  default: {
    findOne:   vi.fn(),
    findById:  vi.fn(),
    create:    vi.fn(),
  },
}));

vi.mock("./ca-firm.model.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("./ca-firm.service.js", () => ({
  getFirmCommsConfig: vi.fn().mockResolvedValue({ emailConfig: null, smsConfig: null }),
}));

vi.mock("../../config/env.js", () => ({
  env: {
    jwtSecret:    "test-secret",
    jwtExpiresIn: "7d",
    appUrl:       "http://localhost:5173",
  },
}));

vi.mock("../../utils/email.util.js", () => ({
  sendMail: vi.fn().mockResolvedValue({ mock: true }),
  clientPortalInviteEmail: vi.fn().mockReturnValue({ subject: "s", html: "h" }),
}));

vi.mock("../../utils/sms.util.js", () => ({
  sendSMS: vi.fn().mockResolvedValue({ mock: true }),
  clientPortalInviteSMS: vi.fn().mockReturnValue("sms body"),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn().mockReturnValue("mock_jwt_token") },
}));

import CAClient from "./ca-client.model.js";
import ClientInvite from "./client-invite.model.js";
import User from "../auth/auth.model.js";
import {
  createClientInvite,
  getClientInviteByToken,
  acceptClientInvite,
} from "./client-invite.service.js";

const makeClientDoc = (overrides = {}) => ({
  _id:         "client_id_1",
  caId:        "ca_id_1",
  fullName:    "Rajesh Kumar",
  pan:         "ABCDE1234F",
  email:       "rajesh@example.com",
  mobile:      "9876543210",
  dateOfBirth: null,
  linkedUserId: null,
  save:        vi.fn().mockResolvedValue(true),
  ...overrides,
});

describe("createClientInvite", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws 404 when client does not belong to this CA", async () => {
    CAClient.findOne.mockResolvedValue(null);

    await expect(createClientInvite("ca_id_1", "client_id_1", "ca_id_1"))
      .rejects.toMatchObject({ status: 404 });
  });

  it("throws 409 when the client already has a linked portal account", async () => {
    CAClient.findOne.mockResolvedValue(makeClientDoc({ linkedUserId: "existing_user" }));

    await expect(createClientInvite("ca_id_1", "client_id_1", "ca_id_1"))
      .rejects.toMatchObject({ status: 409, message: "This client already has a portal account" });
  });

  it("throws 400 when the client has no email on file", async () => {
    CAClient.findOne.mockResolvedValue(makeClientDoc({ email: null }));

    await expect(createClientInvite("ca_id_1", "client_id_1", "ca_id_1"))
      .rejects.toMatchObject({ status: 400 });
  });

  it("throws 409 when a User already exists with this PAN/email", async () => {
    CAClient.findOne.mockResolvedValue(makeClientDoc());
    User.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ _id: "some_user" }) }) });

    await expect(createClientInvite("ca_id_1", "client_id_1", "ca_id_1"))
      .rejects.toMatchObject({ status: 409 });
  });

  it("throws 409 when a pending invite already exists for this client", async () => {
    CAClient.findOne.mockResolvedValue(makeClientDoc());
    User.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
    ClientInvite.findOne.mockResolvedValue({ _id: "existing_invite" });

    await expect(createClientInvite("ca_id_1", "client_id_1", "ca_id_1"))
      .rejects.toMatchObject({ status: 409, message: "A portal invite is already pending for this client" });
  });

  it("creates the invite and sends email + SMS on the happy path", async () => {
    CAClient.findOne.mockResolvedValue(makeClientDoc());
    User.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
    ClientInvite.findOne.mockResolvedValue(null);
    ClientInvite.create.mockResolvedValue({ token: "tok-123" });
    User.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ fullName: "CA Name", caFirmId: null }) }),
    });

    const { sendMail } = await import("../../utils/email.util.js");
    const { sendSMS }  = await import("../../utils/sms.util.js");

    const result = await createClientInvite("ca_id_1", "client_id_1", "ca_id_1");

    expect(ClientInvite.create).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendSMS).toHaveBeenCalledOnce();
    expect(result.token).toBe("tok-123");
  });
});

describe("getClientInviteByToken", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws 404 when token is invalid", async () => {
    ClientInvite.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

    await expect(getClientInviteByToken("bad-token")).rejects.toMatchObject({ status: 404 });
  });

  it("throws 410 when invite has expired", async () => {
    ClientInvite.findOne.mockReturnValue({
      lean: () => Promise.resolve({ status: "pending", expiresAt: new Date(Date.now() - 1000), caClientId: "c1", caId: "ca1" }),
    });

    await expect(getClientInviteByToken("expired-token")).rejects.toMatchObject({ status: 410 });
  });

  it("masks the PAN in the returned info", async () => {
    ClientInvite.findOne.mockReturnValue({
      lean: () => Promise.resolve({
        status: "pending", expiresAt: new Date(Date.now() + 100000),
        email: "rajesh@example.com", caClientId: "client_id_1", caId: "ca_id_1",
      }),
    });
    CAClient.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ fullName: "Rajesh Kumar", pan: "ABCDE1234F" }) }),
    });
    User.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ fullName: "CA Name", caFirmId: null }) }),
    });

    const result = await getClientInviteByToken("good-token");
    expect(result.pan).toBe("AXXXXXXXXF");
    expect(result.fullName).toBe("Rajesh Kumar");
  });
});

describe("acceptClientInvite", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws 400 when the entered PAN does not match the client record", async () => {
    ClientInvite.findOne.mockResolvedValue({
      status: "pending", expiresAt: new Date(Date.now() + 100000), caClientId: "client_id_1", email: "rajesh@example.com",
    });
    CAClient.findById.mockResolvedValue(makeClientDoc({ pan: "ABCDE1234F" }));

    await expect(acceptClientInvite({ token: "tok", pan: "ZZZZZ9999Z", password: "P@ssw0rd1" }))
      .rejects.toMatchObject({ status: 400, message: "PAN does not match our records" });
  });

  it("creates the taxpayer account and links the CAClient on the happy path", async () => {
    const invite = {
      status: "pending", expiresAt: new Date(Date.now() + 100000),
      caClientId: "client_id_1", email: "rajesh@example.com",
      save: vi.fn().mockResolvedValue(true),
    };
    ClientInvite.findOne.mockResolvedValue(invite);
    const client = makeClientDoc();
    CAClient.findById.mockResolvedValue(client);
    User.findOne.mockResolvedValue(null);
    const createdUser = {
      _id: "new_user_id",
      role: "taxpayer",
      toSafeObject: vi.fn().mockReturnValue({ id: "new_user_id", role: "taxpayer" }),
    };
    User.create.mockResolvedValue(createdUser);

    const result = await acceptClientInvite({ token: "tok", pan: "ABCDE1234F", password: "P@ssw0rd1" });

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      pan: "ABCDE1234F", role: "taxpayer", linkedCAClientId: "client_id_1",
    }));
    expect(client.linkedUserId).toBe("new_user_id");
    expect(client.save).toHaveBeenCalledOnce();
    expect(invite.status).toBe("accepted");
    expect(result.token).toBe("mock_jwt_token");
  });

  it("throws 409 when the client already has a linked account", async () => {
    ClientInvite.findOne.mockResolvedValue({
      status: "pending", expiresAt: new Date(Date.now() + 100000), caClientId: "client_id_1",
    });
    CAClient.findById.mockResolvedValue(makeClientDoc({ linkedUserId: "already_linked" }));

    await expect(acceptClientInvite({ token: "tok", pan: "ABCDE1234F", password: "P@ssw0rd1" }))
      .rejects.toMatchObject({ status: 409 });
  });
});
