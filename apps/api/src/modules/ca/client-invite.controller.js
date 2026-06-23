import * as clientInviteService from "./client-invite.service.js";
import { resolveOwnerUserId } from "./ca-firm.service.js";
import { acceptClientInviteSchema } from "./client-invite.validator.js";
import * as response from "../../utils/response.util.js";

// ── CA: send / check invite ──────────────────────────────────────────────────

export const sendInvite = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const invite  = await clientInviteService.createClientInvite(ownerId, req.params.clientId, req.userId);
    return response.success(res, invite, "Portal invite sent", 201);
  } catch (err) { next(err); }
};

export const getInviteStatus = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const data    = await clientInviteService.getClientInviteStatus(ownerId, req.params.clientId);
    return response.success(res, data, "Invite status fetched");
  } catch (err) { next(err); }
};

// ── Public: invite acceptance (no auth) ───────────────────────────────────────

export const getInviteByToken = async (req, res, next) => {
  try {
    const data = await clientInviteService.getClientInviteByToken(req.params.token);
    return response.success(res, data, "Invite fetched");
  } catch (err) { next(err); }
};

export const acceptInvite = async (req, res, next) => {
  try {
    const body = acceptClientInviteSchema.parse(req.body);
    const data = await clientInviteService.acceptClientInvite({ token: req.params.token, ...body });
    return response.success(res, data, "Account created successfully", 201);
  } catch (err) { next(err); }
};
