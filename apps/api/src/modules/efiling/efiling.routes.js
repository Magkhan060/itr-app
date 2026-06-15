import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import * as ctrl from "./efiling.controller.js";

const router = Router();

router.use(protect);
router.use(requireFeature("EFILING_DIRECT"));

router.post("/generate-evc",  ctrl.generateEVC);
router.post("/validate-evc",  ctrl.validateEVC);
router.post("/submit",        ctrl.submitReturn);
router.get("/:filingId/xml",  ctrl.downloadXML);

export default router;
