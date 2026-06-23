import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import * as ctrl from "./client-portal.controller.js";

const router = Router();

router.use(protect);
router.use(requireFeature("CLIENT_PORTAL"));

router.get("/filings",          ctrl.getFilings);
router.get("/filings/:id",      ctrl.getFilingById);
router.get("/filings/:id/xml",  ctrl.downloadFilingXML);
router.get("/filings/:id/refund", ctrl.getRefundStatus);

export default router;
