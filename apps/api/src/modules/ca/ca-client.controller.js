import * as caService from "./ca-client.service.js";
import { resolveOwnerUserId } from "./ca-firm.service.js";
import * as response  from "../../utils/response.util.js";

export const listClients = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const data = await caService.listClients(ownerId);
    return response.success(res, data, "Clients fetched");
  } catch (err) { next(err); }
};

export const getClient = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const data = await caService.getClient(ownerId, req.params.clientId);
    return response.success(res, data, "Client fetched");
  } catch (err) { next(err); }
};

export const createClient = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const data = await caService.createClient(ownerId, req.body);
    return response.success(res, data, "Client added", 201);
  } catch (err) { next(err); }
};

export const updateClient = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const data = await caService.updateClient(ownerId, req.params.clientId, req.body);
    return response.success(res, data, "Client updated");
  } catch (err) { next(err); }
};

export const deleteClient = async (req, res, next) => {
  try {
    const ownerId = await resolveOwnerUserId(req.userId, req.userRole);
    const data = await caService.deleteClient(ownerId, req.params.clientId);
    return response.success(res, data, "Client removed");
  } catch (err) { next(err); }
};
