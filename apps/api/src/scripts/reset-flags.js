/**
 * Dev-only script: reset all feature flags in MongoDB to the defaults
 * defined in packages/feature-flags/flags.js.
 *
 * Uses $set (not $setOnInsert) so it overwrites existing DB values.
 * Run with:  node apps/api/src/scripts/reset-flags.js
 */

import mongoose from "mongoose";
import { FLAGS } from "@itr-app/feature-flags";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/itr-app";

const flagSchema = new mongoose.Schema(
  {
    key:       { type: String, required: true, unique: true },
    enabled:   { type: Boolean, default: false },
    label:     String,
    category:  String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const FeatureFlag = mongoose.model("FeatureFlag", flagSchema);

await mongoose.connect(MONGODB_URI);

let updated = 0;
for (const [key, config] of Object.entries(FLAGS)) {
  await FeatureFlag.findOneAndUpdate(
    { key },
    {
      $set: {
        enabled:  config.enabled,
        label:    config.label,
        category: key.startsWith("ITR_") ? "itr_form" : "sub_feature",
      },
    },
    { upsert: true, new: true }
  );
  console.log(`  ${config.enabled ? "✅" : "⬜"} ${key} → ${config.enabled}`);
  updated++;
}

console.log(`\nReset ${updated} flags to defaults from flags.js`);
await mongoose.disconnect();
