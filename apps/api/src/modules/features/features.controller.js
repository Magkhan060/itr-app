import * as featuresService from "./features.service.js";
import * as response        from "../../utils/response.util.js";

export const getAllFlags = async (req, res, next) => {
  try {
    const flags = await featuresService.getAllFlags();
    return response.success(res, flags, "Flags fetched");
  } catch (err) { next(err); }
};

export const toggleFlag = async (req, res, next) => {
  try {
    const { key }     = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return response.error(res, "enabled must be a boolean", 400, "INVALID_INPUT");
    }
    const flag = await featuresService.toggleFlag(key, enabled, req.userId);
    return response.success(res, flag, `Flag "${key}" ${enabled ? "enabled" : "disabled"}`);
  } catch (err) { next(err); }
};

export const updateFlag = async (req, res, next) => {
  try {
    const { key } = req.params;
    const flag    = await featuresService.updateFlag(key, req.body, req.userId);
    return response.success(res, flag, "Flag updated");
  } catch (err) { next(err); }
};
