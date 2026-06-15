import FeatureFlag from "../modules/features/features.model.js";
import { error }   from "../utils/response.util.js";

// Simple in-process cache so every request doesn't hit MongoDB.
// TTL of 60 s is short enough that an admin toggle takes effect quickly.
const cache = new Map();   // key → { enabled, expiresAt }
const TTL_MS = 60_000;

const getFlagEnabled = async (key) => {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.enabled;

  const flag = await FeatureFlag.findOne({ key }).select("enabled").lean();
  const enabled = flag ? flag.enabled : false;
  cache.set(key, { enabled, expiresAt: Date.now() + TTL_MS });
  return enabled;
};

export const requireFeature = (flagKey) => async (req, res, next) => {
  try {
    const enabled = await getFlagEnabled(flagKey.toUpperCase());
    if (!enabled) {
      return error(res, `Feature "${flagKey}" is currently disabled.`, 403, "FEATURE_DISABLED");
    }
    next();
  } catch (err) {
    next(err);
  }
};
