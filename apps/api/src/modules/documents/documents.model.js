import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:         { type: String, enum: ["form16","form26as","ais","other"], required: true },
    originalName: { type: String, required: true },
    storedName:   { type: String, required: true },
    filePath:     { type: String, required: true },
    fileSize:     { type: Number },
    mimeType:     { type: String },
    parsedData:   { type: mongoose.Schema.Types.Mixed },
    parseStatus:  { type: String, enum: ["pending","success","failed"], default: "pending" },
    parseError:   { type: String }, // Store error message for debugging
    financialYear:{ type: String, default: "2025-26" },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);
