import { Router } from "express";
import { protect }        from "../../middleware/auth.middleware.js";
import { requireCAAdmin } from "../../middleware/requireCAAdmin.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import * as ctrl          from "./approval.controller.js";

const router = Router();

// CA Admin only — sending for approval is a finalization step, same tier as submit/e-file
router.post("/send", protect, requireFeature("CA_PORTAL"), requireCAAdmin, ctrl.sendApproval);

// Public routes — no auth, token-based
router.get("/:token",         ctrl.getApprovalSummary);
router.post("/:token/respond", ctrl.respondToApproval);

export default router;
