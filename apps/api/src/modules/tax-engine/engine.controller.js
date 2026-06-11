import { computeTax, compareRegimes } from "./engine.service.js";
import { computeTaxSchema, compareSchema } from "./engine.validator.js";
import * as response from "../../utils/response.util.js";

export const computeTaxHandler = async (req, res, next) => {
  try {
    const data   = computeTaxSchema.parse(req.body);
    const result = computeTax(data);
    return response.success(res, result, "Tax computed successfully");
  } catch (err) {
    next(err);
  }
};

export const compareRegimesHandler = async (req, res, next) => {
  try {
    const data   = compareSchema.parse(req.body);
    const result = compareRegimes(data);
    return response.success(res, result, "Regime comparison complete");
  } catch (err) {
    next(err);
  }
};
