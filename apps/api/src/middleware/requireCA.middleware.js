import { error } from "../utils/response.util.js";

export const requireCA = (req, res, next) => {
  if (req.userRole !== "ca") {
    return error(res, "Access restricted to Chartered Accountants / Tax Professionals", 403, "NOT_CA");
  }
  next();
};
