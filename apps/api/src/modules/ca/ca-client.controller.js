import * as caService from "./ca-client.service.js";
import * as response  from "../../utils/response.util.js";

export const listClients = async (req, res, next) => {
  try {
    const data = await caService.listClients(req.userId);
    return response.success(res, data, "Clients fetched");
  } catch (err) { next(err); }
};

export const getClient = async (req, res, next) => {
  try {
    const data = await caService.getClient(req.userId, req.params.clientId);
    return response.success(res, data, "Client fetched");
  } catch (err) { next(err); }
};

export const createClient = async (req, res, next) => {
  try {
    const data = await caService.createClient(req.userId, req.body);
    return response.success(res, data, "Client added", 201);
  } catch (err) { next(err); }
};

export const updateClient = async (req, res, next) => {
  try {
    const data = await caService.updateClient(req.userId, req.params.clientId, req.body);
    return response.success(res, data, "Client updated");
  } catch (err) { next(err); }
};

export const deleteClient = async (req, res, next) => {
  try {
    const data = await caService.deleteClient(req.userId, req.params.clientId);
    return response.success(res, data, "Client removed");
  } catch (err) { next(err); }
};
