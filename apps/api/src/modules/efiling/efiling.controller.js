import * as efilingService from "./efiling.service.js";
import * as response from "../../utils/response.util.js";

export const generateEVC = async (req, res, next) => {
  try {
    const { pan, method = "aadhaar_otp" } = req.body;
    if (!pan) return response.error(res, "PAN is required", 400, "MISSING_PAN");
    const result = await efilingService.generateEVC(pan, method);
    return response.success(res, result, "OTP sent for EVC generation");
  } catch (err) { next(err); }
};

export const validateEVC = async (req, res, next) => {
  try {
    const { requestId, otp, pan } = req.body;
    if (!requestId || !otp || !pan) {
      return response.error(res, "requestId, otp, and pan are required", 400, "MISSING_FIELDS");
    }
    const result = await efilingService.validateEVC(requestId, otp, pan);
    return response.success(res, result, "EVC validated successfully");
  } catch (err) { next(err); }
};

export const submitReturn = async (req, res, next) => {
  try {
    const { filingId, evc, evcMethod = "aadhaar_otp" } = req.body;
    if (!filingId || !evc) {
      return response.error(res, "filingId and evc are required", 400, "MISSING_FIELDS");
    }
    const result = await efilingService.submitToITD(req.userId, filingId, evc, evcMethod);
    return response.success(res, result, "ITR submitted to ITD portal successfully", 201);
  } catch (err) { next(err); }
};

export const downloadXML = async (req, res, next) => {
  try {
    const xml = await efilingService.getITRXML(req.userId, req.params.filingId);
    res.set("Content-Type", "application/xml");
    res.set("Content-Disposition", `attachment; filename="ITR1_${req.params.filingId}.xml"`);
    res.send(xml);
  } catch (err) { next(err); }
};
