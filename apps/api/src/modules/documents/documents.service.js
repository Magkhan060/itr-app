import Document        from "./documents.model.js";
import { parseForm16 } from "./form16.parser.js";
import { parseForm26AS } from "./form26as.parser.js";
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

  try {
    let parsedData = null;

    if (type === "form16") {
      parsedData = await parseForm16(file.path);
    } else if (type === "form26as") {
      parsedData = await parseForm26AS(file.path);
    }

    if (parsedData) {
      doc.parsedData  = parsedData;
      doc.parseStatus = "success";
    } else {
      doc.parseStatus = "success"; // Non-parsed types stored as-is
    }
  } catch (err) {
    console.error(`[${type} Parse Error]`, err.message, err);
    doc.parseStatus = "failed";
    doc.parsedData  = { error: err.message };
  }

  await doc.save();
  return doc;
};

export const getMyDocuments = async (userId) => {
  return Document.find({ userId }).sort({ createdAt: -1 }).lean();
};

export const deleteDocument = async (userId, docId) => {
  const doc = await Document.findOne({ _id: docId, userId });
  if (!doc) throw Object.assign(new Error("Document not found"), { status: 404 });
  if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
  await doc.deleteOne();
  return { deleted: true };
};
