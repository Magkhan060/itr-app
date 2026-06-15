import { Router } from "express";
import { protect }     from "../../middleware/auth.middleware.js";
import { requireCA }   from "../../middleware/requireCA.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import * as clientCtrl from "./ca-client.controller.js";
import * as filingCtrl from "../itr/filing.controller.js";

const router = Router();

router.use(protect);
router.use(requireFeature("CA_PORTAL"));
router.use(requireCA);

// ── Client CRUD ───────────────────────────────────────────────────────────────
router.get("/clients",                clientCtrl.listClients);
router.post("/clients",               clientCtrl.createClient);
router.get("/clients/:clientId",      clientCtrl.getClient);
router.put("/clients/:clientId",      clientCtrl.updateClient);
router.delete("/clients/:clientId",   clientCtrl.deleteClient);

// ── CA Filing on behalf of a client ──────────────────────────────────────────
router.post("/clients/:clientId/draft",   requireFeature("ITR_1"), filingCtrl.saveDraftForClient);
router.post("/clients/:clientId/submit",  requireFeature("ITR_1"), filingCtrl.submitITR1ForClient);
router.get("/clients/:clientId/filings",  filingCtrl.getClientFilings);

export default router;
