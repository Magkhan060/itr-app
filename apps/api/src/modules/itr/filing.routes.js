import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import * as filingController from "./filing.controller.js";

import { getRefundStatus } from "./refund.service.js";
import * as response from "../../utils/response.util.js";


const router = Router();

router.use(protect);

router.get("/",           filingController.getMyFilings);
router.get("/:id/xml",    requireFeature("ITR_1"), filingController.downloadFilingXML);
router.get("/:id",        filingController.getFilingById);
router.post("/draft",     requireFeature("ITR_1"), filingController.saveDraft);
router.post("/itr1",      requireFeature("ITR_1"), filingController.submitITR1);

router.get("/:id/refund", async (req, res, next) => {
  try {
    const result = await getRefundStatus(req.userId, req.params.id);
    return response.success(res, result, "Refund status fetched");
  } catch (err) { next(err); }
});

export default router;
