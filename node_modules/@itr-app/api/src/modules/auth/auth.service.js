import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./auth.model.js";
import { env } from "../../config/env.js";

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
    role:        role || "user",
    caFirmName:  role === "ca" ? caFirmName : undefined,
    caMemberNo:  role === "ca" ? caMemberNo : undefined,
  });

  const token = generateToken(user._id, user.role);
  return { user: user.toSafeObject(), token };
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

  const token = generateToken(user._id, user.role);
  return { user: user.toSafeObject(), token };
};

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  return user.toSafeObject();
};

const generateToken = (userId, role = "user") =>
  jwt.sign({ userId, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
