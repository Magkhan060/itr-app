import User    from "../auth/auth.model.js";
import Filing  from "../itr/filing.model.js";
import Document from "../documents/documents.model.js";

export const getDashboardStats = async () => {
  const [totalUsers, totalFilings, submittedFilings, totalDocs] = await Promise.all([
    User.countDocuments(),
    Filing.countDocuments(),
    Filing.countDocuments({ status: { $ne: "draft" } }),
    Document.countDocuments(),
  ]);

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("fullName pan email createdAt role")
    .lean();

  const filingsByType = await Filing.aggregate([
    { $group: { _id: "$itrType", count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]);

  const filingsByStatus = await Filing.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  return {
    totalUsers,
    totalFilings,
    submittedFilings,
    totalDocs,
    recentUsers,
    filingsByType,
    filingsByStatus,
  };
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

export const updateUserRole = async (userId, role, adminId) => {
  if (userId === adminId.toString()) {
    throw Object.assign(new Error("Cannot change your own role"), { status: 400 });
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { role } },
    { new: true }
  ).select("-passwordHash -aadhaarEncrypted");
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
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
  return user;
};
