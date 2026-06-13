import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import { upload } from "./upload.middleware.js";
import * as documentsController from "./documents.controller.js";

const router = Router();
router.use(protect);

router.get("/",        documentsController.getMyDocuments);
router.post("/upload",
  requireFeature("FORM_16_PARSER"),
  upload.single("document"),
  documentsController.uploadDocument
);
router.delete("/:id",  documentsController.deleteDocument);

export default router;
