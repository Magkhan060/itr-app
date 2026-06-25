import { Router } from "express";
import { protect }        from "../../middleware/auth.middleware.js";
import { requireCA }      from "../../middleware/requireCA.middleware.js";
import { requireCAAdmin } from "../../middleware/requireCAAdmin.middleware.js";
import { requireCAWrite } from "../../middleware/requireCAWrite.middleware.js";
import { requireFeature } from "../../middleware/featureFlag.middleware.js";
import * as clientCtrl  from "./ca-client.controller.js";
import * as profileCtrl from "./ca-profile.controller.js";
import * as inviteCtrl  from "./ca-invite.controller.js";
import * as clientInviteCtrl from "./client-invite.controller.js";
import * as filingCtrl  from "../itr/filing.controller.js";

const router = Router();

router.use(protect);
router.use(requireFeature("CA_PORTAL"));
router.use(requireCA);   // any of ca_admin / ca_staff / ca_readonly

// ── CA Profile (firm settings — ITD credentials, firm name) — admin only ────
router.get("/profile", requireCAAdmin, profileCtrl.getCAProfile);
router.put("/profile", requireCAAdmin, profileCtrl.updateCAProfile);
router.post("/profile/test-email", requireCAAdmin, profileCtrl.sendTestEmail);
router.post("/profile/test-sms",   requireCAAdmin, profileCtrl.sendTestSMS);

// ── Firm Team (CA Users) ──────────────────────────────────────────────────────
router.get("/users",                     inviteCtrl.listFirmMembers);            // all CA roles can view the roster
router.post("/users/invite",             requireCAAdmin, inviteCtrl.createInvite);
router.delete("/users/invite/:inviteId", requireCAAdmin, inviteCtrl.revokeInvite);
router.patch("/users/:userId/role",      requireCAAdmin, inviteCtrl.updateMemberRole);
router.patch("/users/:userId/active",    requireCAAdmin, inviteCtrl.toggleMemberActive);

// ── Client CRUD ───────────────────────────────────────────────────────────────
router.get("/clients",                clientCtrl.listClients);
router.get("/clients/:clientId",      clientCtrl.getClient);
router.post("/clients",               requireCAWrite, clientCtrl.createClient);
router.put("/clients/:clientId",      requireCAWrite, clientCtrl.updateClient);
router.delete("/clients/:clientId",   requireCAWrite, clientCtrl.deleteClient);

// ── Client Portal invites ─────────────────────────────────────────────────────
router.post("/clients/:clientId/invite-portal", requireCAWrite, clientInviteCtrl.sendInvite);
router.get("/clients/:clientId/invite-portal",  clientInviteCtrl.getInviteStatus);

// ── CA Filing on behalf of a client ──────────────────────────────────────────
// ca_staff can prepare drafts; only ca_admin can finalize the submission.
router.post("/clients/:clientId/draft",        requireFeature("ITR_1"), requireCAWrite, filingCtrl.saveDraftForClient);
router.post("/clients/:clientId/submit",       requireFeature("ITR_1"), requireCAAdmin, filingCtrl.submitITR1ForClient);
router.post("/clients/:clientId/draft/itr2",   requireFeature("ITR_2"), requireCAWrite, filingCtrl.saveDraftITR2ForClient);
router.post("/clients/:clientId/submit/itr2",  requireFeature("ITR_2"), requireCAAdmin, filingCtrl.submitITR2ForClient);
router.get("/clients/:clientId/filings",  filingCtrl.getClientFilings);
router.get("/clients/:clientId/filings/:filingId/refund", filingCtrl.getClientFilingRefund);

export default router;
