import Document    from "./documents.model.js";
import { parseForm16 } from "./form16.parser.js";
import fs from "fs";

export const uploadDocument = async (userId, file, type, financialYear = "2025-26") => {
  const doc = await Document.create({
    userId,
    type,
    originalName:  file.originalname,
    storedName:    file.filename,
    filePath:      file.path,
    fileSize:      file.size,
    mimeType:      file.mimetype,
    financialYear,
    parseStatus:   "pending",
  });

  // Auto-parse Form 16
  if (type === "form16") {
    try {
      const parsedData = await parseForm16(file.path);
      doc.parsedData   = parsedData;
      doc.parseStatus  = "success";
      await doc.save();
    } catch (err) {
      console.error("[Form16 Parse Error]", err.message, err.stack);
      doc.parseStatus = "failed";
      doc.parseError  = err.message; // Store error for debugging
      await doc.save();
    }
  }

  return doc;
};

export const getMyDocuments = async (userId) => {
  return Document.find({ userId }).sort({ createdAt: -1 }).lean();
};

export const deleteDocument = async (userId, docId) => {
  const doc = await Document.findOne({ _id: docId, userId });
  if (!doc) throw Object.assign(new Error("Document not found"), { status: 404 });

  // Remove file from disk
  if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
  await doc.deleteOne();
  return { deleted: true };
};
