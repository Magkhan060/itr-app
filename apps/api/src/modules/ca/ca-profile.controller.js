import * as profileService from "./ca-profile.service.js";
import * as response       from "../../utils/response.util.js";

export const getCAProfile = async (req, res, next) => {
  try {
    const data = await profileService.getCAProfile(req.userId);
    return response.success(res, data, "Profile fetched");
  } catch (err) { next(err); }
};

export const updateCAProfile = async (req, res, next) => {
  try {
    const data = await profileService.updateCAProfile(req.userId, req.body);
    return response.success(res, data, "Profile updated");
  } catch (err) { next(err); }
};
