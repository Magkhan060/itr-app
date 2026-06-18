import User      from "../auth/auth.model.js";
import Document  from "../documents/documents.model.js";
import AuditLog  from "./audit.model.js";

// Platform-management metrics only — filing content/status is out of scope for
// the platform admin (see Role & Permission Model in CLAUDE.md).
export const getDashboardStats = async () => {
  const [totalUsers, totalDocs] = await Promise.all([
    User.countDocuments(),
    Document.countDocuments(),
  ]);

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("fullName pan email createdAt role")
    .lean();

  return { totalUsers, totalDocs, recentUsers };
};

export const getAllUsers = async ({ page = 1, limit = 20, search = "" }) => {
  const query = search
    ? {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { pan:      { $regex: search, $options: "i" } },
          { email:    { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-passwordHash -aadhaarEncrypted")
      .lean(),
    User.countDocuments(query),
  ]);

  return { users, total, page, limit, pages: Math.ceil(total / limit) };
};

const CA_ROLES = ["ca_admin", "ca_staff", "ca_readonly"];

export const updateUserRole = async (userId, role, adminId) => {
  if (userId === adminId.toString()) {
    throw Object.assign(new Error("Cannot change your own role"), { status: 400 });
  }
  const before = await User.findById(userId).select("role").lean();
  if (!before) throw Object.assign(new Error("User not found"), { status: 404 });
  if (CA_ROLES.includes(before.role)) {
    throw Object.assign(
      new Error("CA team members are managed from the CA Portal's Team tab, not here"),
      { status: 400 }
    );
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { role } },
    { new: true }
  ).select("-passwordHash -aadhaarEncrypted");
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

  await AuditLog.create({
    adminId,
    action:   "ROLE_CHANGE",
    targetId: userId,
    before:   { role: before?.role },
    after:    { role },
  });

  return user;
};

export const toggleUserActive = async (userId, isActive, adminId) => {
  if (userId === adminId.toString()) {
    throw Object.assign(new Error("Cannot deactivate yourself"), { status: 400 });
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive } },
    { new: true }
  ).select("-passwordHash -aadhaarEncrypted");
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

  await AuditLog.create({
    adminId,
    action:   isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    targetId: userId,
    before:   { isActive: !isActive },
    after:    { isActive },
  });

  return user;
};

export const getAuditLogs = async ({ page = 1, limit = 50 }) => {
  const [logs, total] = await Promise.all([
    AuditLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("adminId", "fullName pan email")
      .lean(),
    AuditLog.countDocuments(),
  ]);
  return { logs, total, page, limit };
};
