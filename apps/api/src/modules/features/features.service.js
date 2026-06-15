import FeatureFlag from "./features.model.js";
import { FLAGS }   from "@itr-app/feature-flags";

// Seed DB with default flags from packages/feature-flags on first run
export const seedFlags = async () => {
  for (const [key, config] of Object.entries(FLAGS)) {
    await FeatureFlag.findOneAndUpdate(
      { key },
      {
        $setOnInsert: {
          key,
          enabled:     config.enabled,
          label:       config.label,
          category:    key.startsWith("ITR_") ? "itr_form" : "sub_feature",
        },
      },
      { upsert: true, new: true }
    );
  }
  console.log("✅ Feature flags seeded");
};

export const getAllFlags = async () => {
  return FeatureFlag.find().sort({ category: 1, key: 1 }).lean();
};

export const toggleFlag = async (key, enabled, userId) => {
  const flag = await FeatureFlag.findOneAndUpdate(
    { key: key.toUpperCase() },
    { $set: { enabled, updatedBy: userId } },
    { new: true }
  );
  if (!flag) throw Object.assign(new Error(`Flag "${key}" not found`), { status: 404 });
  return flag;
};

export const updateFlag = async (key, updates, userId) => {
  const allowed = ["enabled", "label", "description"];
  const sanitized = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  sanitized.updatedBy = userId;

  const flag = await FeatureFlag.findOneAndUpdate(
    { key: key.toUpperCase() },
    { $set: sanitized },
    { new: true }
  );
  if (!flag) throw Object.assign(new Error(`Flag "${key}" not found`), { status: 404 });
  return flag;
};
