import * as inviteService from "./ca-invite.service.js";
import { getCAFirmIdForUser } from "./ca-firm.service.js";
import { createInviteSchema, acceptInviteSchema } from "./ca-invite.validator.js";
import * as response from "../../utils/response.util.js";

// ── Admin: firm team management ───────────────────────────────────────────────

export const listFirmMembers = async (req, res, next) => {
  try {
    const firmId = await getCAFirmIdForUser(req.userId);
    const data   = await inviteService.listFirmMembers(firmId);
    return response.success(res, data, "Firm members fetched");
  } catch (err) { next(err); }
};

export const createInvite = async (req, res, next) => {
  try {
    const body   = createInviteSchema.parse(req.body);
    const firmId = await getCAFirmIdForUser(req.userId);
    const invite = await inviteService.createInvite(firmId, req.userId, body);
    return response.success(res, invite, "Invite sent", 201);
  } catch (err) { next(err); }
};

export const revokeInvite = async (req, res, next) => {
  try {
    const firmId = await getCAFirmIdForUser(req.userId);
    const data   = await inviteService.revokeInvite(firmId, req.params.inviteId);
    return response.success(res, data, "Invite revoked");
  } catch (err) { next(err); }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const firmId = await getCAFirmIdForUser(req.userId);
    const data   = await inviteService.updateMemberRole(firmId, req.params.userId, req.body.role);
    return response.success(res, data, "Role updated");
  } catch (err) { next(err); }
};

export const toggleMemberActive = async (req, res, next) => {
  try {
    const firmId = await getCAFirmIdForUser(req.userId);
    const data   = await inviteService.toggleMemberActive(firmId, req.params.userId, req.body.isActive);
    return response.success(res, data, `Member ${req.body.isActive ? "activated" : "deactivated"}`);
  } catch (err) { next(err); }
};

// ── Public: invite acceptance (no auth) ───────────────────────────────────────

export const getInviteByToken = async (req, res, next) => {
  try {
    const data = await inviteService.getInviteByToken(req.params.token);
    return response.success(res, data, "Invite fetched");
  } catch (err) { next(err); }
};

export const acceptInvite = async (req, res, next) => {
  try {
    const body = acceptInviteSchema.parse(req.body);
    const data = await inviteService.acceptInvite({ token: req.params.token, ...body });
    return response.success(res, data, "Account created successfully", 201);
  } catch (err) { next(err); }
};
