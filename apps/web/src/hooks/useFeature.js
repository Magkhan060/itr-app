import { isEnabled } from "../config/features.config.js";

const useFeature = (flagKey) => isEnabled(flagKey);

export default useFeature;
