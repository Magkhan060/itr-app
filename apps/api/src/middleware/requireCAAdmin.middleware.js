import { error } from "../utils/response.util.js";

export const requireCAAdmin = (req, res, next) => {
  if (req.userRole !== "ca_admin") {
    return error(res, "This action is restricted to the CA Admin", 403, "NOT_CA_ADMIN");
  }
  next();
};
