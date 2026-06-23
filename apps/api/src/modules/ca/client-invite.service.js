import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../auth/auth.model.js";
import CAClient from "./ca-client.model.js";
import CAFirm from "./ca-firm.model.js";
import ClientInvite from "./client-invite.model.js";
import { env } from "../../config/env.js";
import { sendMail, clientPortalInviteEmail } from "../../utils/email.util.js";
import { sendSMS, clientPortalInviteSMS } from "../../utils/sms.util.js";

const INVITE_EXPIRY_DAYS = 7;

const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// Masks all but the first and last character of the PAN so the public
// invite-info endpoint can greet the client without giving away enough of
// the PAN to make the "confirm your PAN" identity check meaningless.
const maskPAN = (pan) => `${pan[0]}${"X".repeat(pan.length - 2)}${pan[pan.length - 1]}`;

// ── CA: send / check invite ──────────────────────────────────────────────────

export const createClientInvite = async (caId, clientId, invitedByUserId) => {
  const client = await CAClient.findOne({ _id: clientId, caId });
  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });
  if (client.linkedUserId) {
    throw Object.assign(new Error("This client already has a portal account"), { status: 409 });
  }
  if (!client.email) {
    throw Object.assign(new Error("Client has no email on file — add one before inviting"), { status: 400 });
  }
  if (!client.mobile) {
    throw Object.assign(new Error("Client has no mobile number on file — add one before inviting"), { status: 400 });
  }

  const existingUser = await User.findOne({
    $or: [{ pan: client.pan }, { email: client.email }],
  }).select("_id").lean();
  if (existingUser) {
    throw Object.assign(
      new Error("A platform account already exists for this PAN/email. Ask the client to contact you directly."),
      { status: 409 }
    );
  }

  const existingInvite = await ClientInvite.findOne({ caClientId: clientId, status: "pending" });
  if (existingInvite) throw Object.assign(new Error("A portal invite is already pending for this client"), { status: 409 });

  const invite = await ClientInvite.create({
    caClientId: clientId,
    caId,
    email:      client.email,
    token:      randomUUID(),
    invitedBy:  invitedByUserId,
    expiresAt:  new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  const ca = await User.findById(caId).select("fullName caFirmId").lean();
  const firmName = ca?.caFirmId
    ? (await CAFirm.findById(ca.caFirmId).select("firmName").lean())?.firmName || null
    : null;

  await sendMail({
    to: client.email,
    ...clientPortalInviteEmail({
      clientName: client.fullName,
      caName:     ca?.fullName,
      firmName,
      token:      invite.token,
      appUrl:     env.appUrl,
    }),
  });

  if (client.mobile) {
    await sendSMS({
      to:   client.mobile,
      body: clientPortalInviteSMS(client.fullName, `${env.appUrl}/client-portal/join/${invite.token}`),
    });
  }

  return invite;
};

export const getClientInviteStatus = async (caId, clientId) => {
  const client = await CAClient.findOne({ _id: clientId, caId }).select("linkedUserId").lean();
  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });

  if (client.linkedUserId) return { status: "active" };

  const invite = await ClientInvite.findOne({ caClientId: clientId, status: "pending" })
    .sort({ createdAt: -1 })
    .lean();
  if (!invite) return { status: "not_invited" };
  if (invite.expiresAt < new Date()) return { status: "expired" };
  return { status: "pending", sentAt: invite.createdAt };
};

// ── Public: invite acceptance (no auth) ──────────────────────────────────────

export const getClientInviteByToken = async (token) => {
  const invite = await ClientInvite.findOne({ token }).lean();
  if (!invite) throw Object.assign(new Error("Invite link is invalid"), { status: 404 });
  if (invite.status !== "pending") {
    throw Object.assign(new Error("This invite has already been used or revoked"), { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    throw Object.assign(new Error("This invite has expired"), { status: 410 });
  }

  const client = await CAClient.findById(invite.caClientId).select("fullName email pan").lean();
  const ca     = await User.findById(invite.caId).select("fullName caFirmId").lean();
  const firmName = ca?.caFirmId
    ? (await CAFirm.findById(ca.caFirmId).select("firmName").lean())?.firmName || null
    : null;

  return {
    fullName: client?.fullName,
    email:    invite.email,
    pan:      maskPAN(client?.pan || ""),
    caName:   ca?.fullName,
    firmName,
  };
};

export const acceptClientInvite = async ({ token: inviteToken, pan, password }) => {
  const invite = await ClientInvite.findOne({ token: inviteToken });
  if (!invite) throw Object.assign(new Error("Invite link is invalid"), { status: 404 });
  if (invite.status !== "pending") {
    throw Object.assign(new Error("This invite has already been used or revoked"), { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    throw Object.assign(new Error("This invite has expired"), { status: 410 });
  }

  const client = await CAClient.findById(invite.caClientId);
  if (!client) throw Object.assign(new Error("Client record not found"), { status: 404 });
  if (client.linkedUserId) {
    throw Object.assign(new Error("This client already has a portal account"), { status: 409 });
  }
  if (pan !== client.pan) {
    throw Object.assign(new Error("PAN does not match our records"), { status: 400 });
  }

  const existing = await User.findOne({ $or: [{ pan }, { email: invite.email }] });
  if (existing) {
    const field = existing.pan === pan ? "PAN" : "Email";
    throw Object.assign(new Error(`${field} already registered`), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    pan,
    fullName:    client.fullName,
    email:       invite.email,
    mobile:      client.mobile,
    passwordHash,
    dateOfBirth: client.dateOfBirth || null,
    role:        "taxpayer",
    linkedCAClientId: client._id,
  });

  client.linkedUserId = user._id;
  await client.save();

  invite.status = "accepted";
  invite.acceptedByUserId = user._id;
  await invite.save();

  const jwtToken = generateToken(user._id, user.role);
  return { user: user.toSafeObject(), token: jwtToken };
};
