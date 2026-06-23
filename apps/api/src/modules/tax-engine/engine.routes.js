import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
// import { computeTaxHandler, compareRegimesHandler } from "./engine.controller.js";
import { computeTaxHandler, compareRegimesHandler, advanceTaxHandler, compareRegimesWithCGHandler } from "./engine.controller.js";

const router = Router();
router.post("/advance-tax", protect, advanceTaxHandler);
router.post("/compute",  protect, computeTaxHandler);
router.post("/compare",  protect, compareRegimesHandler);
router.post("/compare-cg", protect, compareRegimesWithCGHandler);

export default router;
