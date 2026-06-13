import * as documentsService from "./documents.service.js";
import * as response from "../../utils/response.util.js";

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return response.error(res, "No file uploaded", 400, "NO_FILE");
    const { type = "form16", financialYear = "2025-26" } = req.body;
    const result = await documentsService.uploadDocument(req.userId, req.file, type, financialYear);
    return response.success(res, result, "Document uploaded and parsed", 201);
  } catch (err) { next(err); }
};

export const getMyDocuments = async (req, res, next) => {
  try {
    const result = await documentsService.getMyDocuments(req.userId);
    return response.success(res, result, "Documents fetched");
  } catch (err) { next(err); }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const result = await documentsService.deleteDocument(req.userId, req.params.id);
    return response.success(res, result, "Document deleted");
  } catch (err) { next(err); }
};
