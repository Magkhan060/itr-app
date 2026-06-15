import { Router } from "express";
import { protect }      from "../../middleware/auth.middleware.js";
import { requireCA }    from "../../middleware/requireCA.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import * as ctrl        from "./approval.controller.js";

const router = Router();

// CA-only: send approval request
router.post("/send", protect, requireFeature("CA_PORTAL"), requireCA, ctrl.sendApproval);

// Public routes — no auth, token-based
router.get("/:token",         ctrl.getApprovalSummary);
router.post("/:token/respond", ctrl.respondToApproval);

export default router;
