import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { error } from "../utils/response.util.js";

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return error(res, "No token provided", 401, "NO_TOKEN");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return error(res, "Invalid or expired token", 401, "INVALID_TOKEN");
  }
};
