import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import * as filingController from "./filing.controller.js";

const router = Router();

router.use(protect);

router.get("/",           filingController.getMyFilings);
router.get("/:id",        filingController.getFilingById);
router.post("/draft",     requireFeature("ITR_1"), filingController.saveDraft);
router.post("/itr1",      requireFeature("ITR_1"), filingController.submitITR1);

export default router;
