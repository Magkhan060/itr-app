import User  from "../modules/auth/auth.model.js";
import { error } from "../utils/response.util.js";

export const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("role");
    if (!user || user.role !== "platform_admin") {
      return error(res, "Admin access required", 403, "FORBIDDEN");
    }
    next();
  } catch (err) {
    next(err);
  }
};
