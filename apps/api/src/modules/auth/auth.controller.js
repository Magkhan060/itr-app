import * as authService from "./auth.service.js";
import * as response from "../../utils/response.util.js";
import { registerSchema, loginSchema } from "./auth.validator.js";

export const register = async (req, res, next) => {
  try {
    const data   = registerSchema.parse(req.body);
    const result = await authService.registerUser(data);
    return response.success(res, result, "Registration successful", 201);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const data   = loginSchema.parse(req.body);
    const result = await authService.loginUser(data);
    return response.success(res, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.userId);
    return response.success(res, user, "User fetched");
  } catch (err) {
    next(err);
  }
};
