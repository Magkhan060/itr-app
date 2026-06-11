import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { computeTaxHandler, compareRegimesHandler } from "./engine.controller.js";

const router = Router();

router.post("/compute",  protect, computeTaxHandler);
router.post("/compare",  protect, compareRegimesHandler);

export default router;
