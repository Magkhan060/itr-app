import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../auth/auth.model.js";
import CAFirm from "./ca-firm.model.js";
import CAInvite from "./ca-invite.model.js";
import { env } from "../../config/env.js";
import { sendMail, caInviteEmail } from "../../utils/email.util.js";

const INVITE_EXPIRY_DAYS = 7;
const INVITE_ROLES = ["ca_staff", "ca_readonly"];

const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// ── Admin: firm team management ───────────────────────────────────────────────

export const createInvite = async (caFirmId, invitedByUserId, { email, role }) => {
  if (!INVITE_ROLES.includes(role)) {
    throw Object.assign(new Error("Role must be ca_staff or ca_readonly"), { status: 400 });
  }
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id").lean();
  if (existingUser) throw Object.assign(new Error("A user with this email already exists"), { status: 409 });

  const existingInvite = await CAInvite.findOne({ caFirmId, email: normalizedEmail, status: "pending" });
  if (existingInvite) throw Object.assign(new Error("An invite is already pending for this email"), { status: 409 });

  const firm = await CAFirm.findById(caFirmId).select("firmName").lean();

  const invite = await CAInvite.create({
    caFirmId,
    email:     normalizedEmail,
    role,
    token:     randomUUID(),
    invitedBy: invitedByUserId,
    expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  const inviter = await User.findById(invitedByUserId).select("fullName").lean();
  await sendMail({
    to: normalizedEmail,
    ...caInviteEmail({
      inviterName: inviter?.fullName,
      firmName:    firm?.firmName,
      role,
      token:       invite.token,
      appUrl:      env.appUrl,
    }),
  });

  return invite;
};

export const listFirmMembers = async (caFirmId) => {
  const firm = await CAFirm.findById(caFirmId).select("adminUserId").lean();

  const members = await User.find({
    $or: [{ _id: firm?.adminUserId }, { caFirmId }],
  }).select("fullName email role isActive createdAt").sort({ createdAt: 1 }).lean();

  const pendingInvites = await CAInvite.find({ caFirmId, status: "pending" })
    .sort({ createdAt: -1 })
    .lean();

  return { members, pendingInvites };
};

export const revokeInvite = async (caFirmId, inviteId) => {
  const invite = await CAInvite.findOneAndUpdate(
    { _id: inviteId, caFirmId, status: "pending" },
    { $set: { status: "revoked" } },
    { new: true }
  );
  if (!invite) throw Object.assign(new Error("Invite not found or already actioned"), { status: 404 });
  return invite;
};

export const updateMemberRole = async (caFirmId, userId, role) => {
  if (!INVITE_ROLES.includes(role)) {
    throw Object.assign(new Error("Role must be ca_staff or ca_readonly"), { status: 400 });
  }
  const user = await User.findOneAndUpdate(
    { _id: userId, caFirmId },
    { $set: { role } },
    { new: true }
  ).select("-passwordHash -aadhaarEncrypted");
  if (!user) throw Object.assign(new Error("Firm member not found"), { status: 404 });
  return user;
};

export const toggleMemberActive = async (caFirmId, userId, isActive) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, caFirmId },
    { $set: { isActive } },
    { new: true }
  ).select("-passwordHash -aadhaarEncrypted");
  if (!user) throw Object.assign(new Error("Firm member not found"), { status: 404 });
  return user;
};

// ── Public: invite acceptance (no auth) ───────────────────────────────────────

export const getInviteByToken = async (token) => {
  const invite = await CAInvite.findOne({ token }).lean();
  if (!invite) throw Object.assign(new Error("Invite link is invalid"), { status: 404 });
  if (invite.status !== "pending") {
    throw Object.assign(new Error("This invite has already been used or revoked"), { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    throw Object.assign(new Error("This invite has expired"), { status: 410 });
  }

  const firm = await CAFirm.findById(invite.caFirmId).select("firmName").lean();
  return { email: invite.email, role: invite.role, firmName: firm?.firmName || "" };
};

export const acceptInvite = async ({ token: inviteToken, pan, fullName, mobile, password, dateOfBirth }) => {
  const invite = await CAInvite.findOne({ token: inviteToken });
  if (!invite) throw Object.assign(new Error("Invite link is invalid"), { status: 404 });
  if (invite.status !== "pending") {
    throw Object.assign(new Error("This invite has already been used or revoked"), { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    throw Object.assign(new Error("This invite has expired"), { status: 410 });
  }

  const existing = await User.findOne({ $or: [{ pan }, { email: invite.email }] });
  if (existing) {
    const field = existing.pan === pan ? "PAN" : "Email";
    throw Object.assign(new Error(`${field} already registered`), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    pan,
    fullName,
    email: invite.email,
    mobile,
    passwordHash,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    role:        invite.role,
    caFirmId:    invite.caFirmId,
  });

  invite.status = "accepted";
  invite.acceptedByUserId = user._id;
  await invite.save();

  const firm     = await CAFirm.findById(invite.caFirmId).lean();
  const jwtToken = generateToken(user._id, user.role);
  return { user: user.toSafeObject(firm), token: jwtToken };
};
