import * as adminService from "./admin.service.js";
import * as response     from "../../utils/response.util.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return response.success(res, stats, "Stats fetched");
  } catch (err) { next(err); }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const result = await adminService.getAllUsers({
      page:   parseInt(page),
      limit:  parseInt(limit),
      search,
    });
    return response.success(res, result, "Users fetched");
  } catch (err) { next(err); }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return response.error(res, "Invalid role", 400, "INVALID_ROLE");
    }
    const user = await adminService.updateUserRole(req.params.id, role, req.userId);
    return response.success(res, user, "Role updated");
  } catch (err) { next(err); }
};

export const toggleUserActive = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await adminService.toggleUserActive(req.params.id, isActive, req.userId);
    return response.success(res, user, `User ${isActive ? "activated" : "deactivated"}`);
  } catch (err) { next(err); }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await adminService.getAuditLogs({
      page:  parseInt(page),
      limit: parseInt(limit),
    });
    return response.success(res, result, "Audit logs fetched");
  } catch (err) { next(err); }
};
