import { useFlagsStore } from "../store/index.js";
import { FLAGS } from "../config/features.config.js";

const useFeature = (flagKey) => {
  const flags = useFlagsStore((s) => s.flags);
  if (Object.keys(flags).length > 0) return flags[flagKey] ?? false;
  return FLAGS[flagKey]?.enabled ?? false;
};

export default useFeature;
