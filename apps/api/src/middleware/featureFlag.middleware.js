import { FLAGS } from "@itr-app/feature-flags";
import { error } from "../utils/response.util.js";

export const requireFeature = (flagKey) => (req, res, next) => {
  if (!FLAGS[flagKey]?.enabled) {
    return error(
      res,
      `Feature "${FLAGS[flagKey]?.label ?? flagKey}" is currently disabled.`,
      403,
      "FEATURE_DISABLED"
    );
  }
  next();
};
