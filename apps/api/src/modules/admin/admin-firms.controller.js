import * as firmsService from "./admin-firms.service.js";
import * as response     from "../../utils/response.util.js";

export const getAllFirms = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const result = await firmsService.getAllFirms({
      page:  parseInt(page),
      limit: parseInt(limit),
      search,
    });
    return response.success(res, result, "Firms fetched");
  } catch (err) { next(err); }
};

export const getFirmDetail = async (req, res, next) => {
  try {
    const firm = await firmsService.getFirmDetail(req.params.id);
    return response.success(res, firm, "Firm fetched");
  } catch (err) { next(err); }
};

export const toggleFirmActive = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const firm = await firmsService.toggleFirmActive(req.params.id, isActive, req.userId);
    return response.success(res, firm, `Firm ${isActive ? "activated" : "deactivated"}`);
  } catch (err) { next(err); }
};
