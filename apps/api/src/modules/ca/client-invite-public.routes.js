import { Router } from "express";
import * as ctrl from "./client-invite.controller.js";

const router = Router();

// Public, token-based — no auth required
router.get("/:token",         ctrl.getInviteByToken);
router.post("/:token/accept", ctrl.acceptInvite);

export default router;
