import mongoose from "mongoose";

const featureFlagSchema = new mongoose.Schema(
  {
    key: {
      type:     String,
      required: true,
      unique:   true,
      uppercase: true,
      trim:     true,
    },
    enabled: {
      type:    Boolean,
      default: false,
    },
    label: {
      type:    String,
      required: true,
    },
    description: {
      type:    String,
      default: "",
    },
    category: {
      type:    String,
      enum:    ["itr_form", "sub_feature", "integration"],
      default: "sub_feature",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("FeatureFlag", featureFlagSchema);
