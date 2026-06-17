import { error } from "../utils/response.util.js";

const CA_ROLES = ["ca_admin", "ca_staff", "ca_readonly"];

export const requireCA = (req, res, next) => {
  if (!CA_ROLES.includes(req.userRole)) {
    return error(res, "Access restricted to Chartered Accountants / Tax Professionals", 403, "NOT_CA");
  }
  next();
};
