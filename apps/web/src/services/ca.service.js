import api from "./api.js";

// ── Client CRUD ───────────────────────────────────────────────────────────────
export const listClients    = ()           => api.get("/ca/clients");
export const getClient      = (id)         => api.get(`/ca/clients/${id}`);
export const createClient   = (data)       => api.post("/ca/clients", data);
export const updateClient   = (id, data)   => api.put(`/ca/clients/${id}`, data);
export const deleteClient   = (id)         => api.delete(`/ca/clients/${id}`);

// ── CA Filing on behalf of client ────────────────────────────────────────────
export const saveDraftForClient   = (clientId, data) => api.post(`/ca/clients/${clientId}/draft`,  data);
export const submitITR1ForClient  = (clientId, data) => api.post(`/ca/clients/${clientId}/submit`, data);
export const getClientFilings     = (clientId)       => api.get(`/ca/clients/${clientId}/filings`);

// ── Approvals ─────────────────────────────────────────────────────────────────
export const sendApproval         = (filingId)                  => api.post("/approvals/send", { filingId });
export const getApprovalSummary   = (token)                     => api.get(`/approvals/${token}`);
export const respondToApproval    = (token, action, comment)    => api.post(`/approvals/${token}/respond`, { action, comment });
