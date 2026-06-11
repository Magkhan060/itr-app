import { error } from "../utils/response.util.js";
import { ZodError } from "zod";

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return error(res, message, 400, "VALIDATION_ERROR");
  }
  if (err.name === "ValidationError") {
    return error(res, err.message, 400, "VALIDATION_ERROR");
  }
  if (err.name === "JsonWebTokenError") {
    return error(res, "Invalid token", 401, "INVALID_TOKEN");
  }
  if (err.name === "TokenExpiredError") {
    return error(res, "Token expired", 401, "TOKEN_EXPIRED");
  }

  return error(res, err.message || "Internal server error", err.status || 500);
};
