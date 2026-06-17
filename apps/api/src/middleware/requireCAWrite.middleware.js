import { error } from "../utils/response.util.js";

const WRITE_ROLES = ["ca_admin", "ca_staff"];

export const requireCAWrite = (req, res, next) => {
  if (!WRITE_ROLES.includes(req.userRole)) {
    return error(res, "Read-only access — contact your CA Admin to make changes", 403, "READONLY_ACCESS");
  }
  next();
};
