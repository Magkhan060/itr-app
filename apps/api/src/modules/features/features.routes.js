import { Router }       from "express";
import { protect }      from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/admin.middleware.js";
import * as featuresController from "./features.controller.js";

const router = Router();

// Public — frontend fetches flags on load
router.get("/", featuresController.getAllFlags);

// Admin only
router.patch("/:key/toggle", protect, requireAdmin, featuresController.toggleFlag);
router.patch("/:key",        protect, requireAdmin, featuresController.updateFlag);

export default router;
