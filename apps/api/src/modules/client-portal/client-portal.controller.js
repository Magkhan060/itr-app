import * as portalService from "./client-portal.service.js";
import * as response from "../../utils/response.util.js";

export const getFilings = async (req, res, next) => {
  try {
    const data = await portalService.getPortalFilings(req.userId);
    return response.success(res, data, "Filings fetched");
  } catch (err) { next(err); }
};

export const getFilingById = async (req, res, next) => {
  try {
    const data = await portalService.getPortalFilingById(req.userId, req.params.id);
    return response.success(res, data, "Filing fetched");
  } catch (err) { next(err); }
};

export const downloadFilingXML = async (req, res, next) => {
  try {
    const xml = await portalService.getPortalFilingXML(req.userId, req.params.id);
    res.set("Content-Type", "application/xml");
    res.set("Content-Disposition", `attachment; filename="ITR1_AY2026-27_${req.params.id}.xml"`);
    res.send(xml);
  } catch (err) { next(err); }
};

export const getRefundStatus = async (req, res, next) => {
  try {
    const data = await portalService.getPortalRefundStatus(req.userId, req.params.id);
    return response.success(res, data, "Refund status fetched");
  } catch (err) { next(err); }
};
