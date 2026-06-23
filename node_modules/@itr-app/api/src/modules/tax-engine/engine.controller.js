// import { computeTax, compareRegimes } from "./engine.service.js";
// import { computeTaxSchema, compareSchema } from "./engine.validator.js";
// import * as response from "../../utils/response.util.js";
import { computeTax, compareRegimes, compareRegimesWithCapitalGains } from "./engine.service.js";
import { computeAdvanceTax } from "./advance-tax.service.js";
import { computeTaxSchema, compareSchema, compareCGSchema } from "./engine.validator.js";
import { z } from "zod";
import * as response from "../../utils/response.util.js";

export const advanceTaxHandler = async (req, res, next) => {
  try {
    const schema = compareSchema.extend({
      tdsDeducted: z.number().min(0).default(0),
      regime:      z.enum(["old","new"]).default("new"),
    });
    const data   = schema.parse(req.body);
    const result = computeAdvanceTax(data);
    return response.success(res, result, "Advance tax computed");
  } catch (err) { next(err); }
};


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

// ITR-2's Tax Summary preview step — same shape as compareRegimesHandler plus
// equity capital gains (Sec 111A/112A), so the wizard can show the tax
// breakdown before the user commits to a final submission.
export const compareRegimesWithCGHandler = async (req, res, next) => {
  try {
    const data   = compareCGSchema.parse(req.body);
    const result = compareRegimesWithCapitalGains(data);
    return response.success(res, result, "Regime comparison complete");
  } catch (err) {
    next(err);
  }
};
