import * as profileService from "./ca-profile.service.js";
import { updateCAProfileSchema } from "./ca-profile.validator.js";
import * as response       from "../../utils/response.util.js";

export const getCAProfile = async (req, res, next) => {
  try {
    const data = await profileService.getCAProfile(req.userId);
    return response.success(res, data, "Profile fetched");
  } catch (err) { next(err); }
};

export const updateCAProfile = async (req, res, next) => {
  try {
    const body = updateCAProfileSchema.parse(req.body);
    const data = await profileService.updateCAProfile(req.userId, body);
    return response.success(res, data, "Profile updated");
  } catch (err) { next(err); }
};

export const sendTestEmail = async (req, res, next) => {
  try {
    if (!req.body?.to) throw Object.assign(new Error("Recipient email is required"), { status: 400 });
    const data = await profileService.sendTestEmail(req.userId, req.body.to);
    return response.success(res, data, "Test email sent");
  } catch (err) { next(err); }
};

export const sendTestSMS = async (req, res, next) => {
  try {
    if (!req.body?.to) throw Object.assign(new Error("Recipient mobile number is required"), { status: 400 });
    const data = await profileService.sendTestSMS(req.userId, req.body.to);
    return response.success(res, data, "Test SMS sent");
  } catch (err) { next(err); }
};
