import { Router }       from "express";
import { protect }      from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/admin.middleware.js";
import * as adminController from "./admin.controller.js";

const router = Router();
router.use(protect, requireAdmin);

router.get("/stats",                adminController.getDashboardStats);
router.get("/users",                adminController.getAllUsers);
router.patch("/users/:id/role",     adminController.updateUserRole);
router.patch("/users/:id/active",   adminController.toggleUserActive);

export default router;
