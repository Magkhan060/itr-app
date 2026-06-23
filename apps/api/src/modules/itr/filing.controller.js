import * as filingService from "./filing.service.js";
import { getITRXML } from "../efiling/efiling.service.js";
import { resolveOwnerUserId } from "../ca/ca-firm.service.js";
import {
  saveDraftSchema, submitITR1Schema,
  saveDraftItr2Schema, submitITR2Schema,
} from "./filing.validator.js";
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

// ── ITR-2 ─────────────────────────────────────────────────────────────────────

export const saveDraftITR2 = async (req, res, next) => {
  try {
    const data   = saveDraftItr2Schema.parse(req.body);
    const result = await filingService.saveDraft(req.userId, data);
    return response.success(res, result, "Draft saved");
  } catch (err) { next(err); }
};

export const submitITR2 = async (req, res, next) => {
  try {
    const data   = submitITR2Schema.parse(req.body);
    const result = await filingService.submitITR2(req.userId, data);
    return response.success(res, result, "ITR-2 submitted successfully", 201);
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

// ── CA Portal controllers ─────────────────────────────────────────────────────

export const saveDraftForClient = async (req, res, next) => {
  try {
    const data    = saveDraftSchema.parse(req.body);
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const result  = await filingService.saveDraftForClient(ownerId, req.params.clientId, data, req.userId);
    return response.success(res, result, "Draft saved");
  } catch (err) { next(err); }
};

export const submitITR1ForClient = async (req, res, next) => {
  try {
    const data    = submitITR1Schema.parse(req.body);
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const result  = await filingService.submitITR1ForClient(ownerId, req.params.clientId, data, req.userId);
    return response.success(res, result, "ITR-1 submitted for client", 201);
  } catch (err) { next(err); }
};

export const getClientFilings = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const result  = await filingService.getClientFilings(ownerId, req.params.clientId);
    return response.success(res, result, "Client filings fetched");
  } catch (err) { next(err); }
};

export const downloadFilingXML = async (req, res, next) => {
  try {
    const xml = await getITRXML(req.userId, req.params.id);
    res.set("Content-Type", "application/xml");
    res.set("Content-Disposition", `attachment; filename="ITR_AY2026-27_${req.params.id}.xml"`);
    res.send(xml);
  } catch (err) { next(err); }
};
