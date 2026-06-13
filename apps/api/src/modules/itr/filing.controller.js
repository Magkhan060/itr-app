import * as filingService from "./filing.service.js";
import { saveDraftSchema, submitITR1Schema } from "./filing.validator.js";
import * as response from "../../utils/response.util.js";

export const saveDraft = async (req, res, next) => {
  try {
    const data   = saveDraftSchema.parse(req.body);
    const result = await filingService.saveDraft(req.userId, data);
    return response.success(res, result, "Draft saved");
  } catch (err) { next(err); }
};

export const submitITR1 = async (req, res, next) => {
  try {
    const data   = submitITR1Schema.parse(req.body);
    const result = await filingService.submitITR1(req.userId, data);
    return response.success(res, result, "ITR-1 submitted successfully", 201);
  } catch (err) { next(err); }
};

export const getMyFilings = async (req, res, next) => {
  try {
    const result = await filingService.getMyFilings(req.userId);
    return response.success(res, result, "Filings fetched");
  } catch (err) { next(err); }
};

export const getFilingById = async (req, res, next) => {
  try {
    const result = await filingService.getFilingById(req.userId, req.params.id);
    return response.success(res, result, "Filing fetched");
  } catch (err) { next(err); }
};
