import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./auth.model.js";
import { env } from "../../config/env.js";
import { createFirmForAdmin, getFirmById } from "../ca/ca-firm.service.js";

export const registerUser = async ({ pan, fullName, email, mobile, password, dateOfBirth, role, caFirmName, caMemberNo }) => {
  // Check duplicates
  const existing = await User.findOne({ $or: [{ pan }, { email }] });
  if (existing) {
    const field = existing.pan === pan ? "PAN" : "Email";
    throw Object.assign(new Error(`${field} already registered`), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    pan,
    fullName,
    email,
    mobile,
    passwordHash,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    role:        role || "taxpayer",
  });

  let firm = null;
  if (role === "ca_admin") {
    firm = await createFirmForAdmin(user._id, { firmName: caFirmName, icaiMemberNo: caMemberNo });
    user.caFirmId = firm._id;
    await user.save();
  }

  const token = generateToken(user._id, user.role);
  return { user: user.toSafeObject(firm), token };
};

export const loginUser = async ({ pan, password }) => {
  const user = await User.findOne({ pan });
  if (!user) {
    throw Object.assign(new Error("Invalid PAN or password"), { status: 401 });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw Object.assign(new Error("Invalid PAN or password"), { status: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error("Account has been deactivated"), { status: 403 });
  }

  user.lastLogin = new Date();
  await user.save();

  const firm  = await getFirmById(user.caFirmId);
  const token = generateToken(user._id, user.role);
  return { user: user.toSafeObject(firm), token };
};

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  const firm = await getFirmById(user.caFirmId);
  return user.toSafeObject(firm);
};

const generateToken = (userId, role = "user") =>
  jwt.sign({ userId, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
