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

// ── CA Profile ───────────────────────────────────────────────────────────────
export const getCAProfile    = ()       => api.get("/ca/profile");
export const updateCAProfile = (data)   => api.put("/ca/profile", data);

// ── Firm Team (CA Users) ──────────────────────────────────────────────────────
export const listFirmMembers    = ()                       => api.get("/ca/users");
export const inviteFirmMember   = (data)                   => api.post("/ca/users/invite", data);
export const revokeInvite       = (inviteId)                => api.delete(`/ca/users/invite/${inviteId}`);
export const updateMemberRole   = (userId, role)            => api.patch(`/ca/users/${userId}/role`, { role });
export const toggleMemberActive = (userId, isActive)        => api.patch(`/ca/users/${userId}/active`, { isActive });

// ── Public: invite acceptance ────────────────────────────────────────────────
export const getInviteInfo = (token)       => api.get(`/invites/${token}`);
export const acceptInvite  = (token, data) => api.post(`/invites/${token}/accept`, data);

// ── Client Portal invites ────────────────────────────────────────────────────
export const sendClientPortalInvite      = (clientId)       => api.post(`/ca/clients/${clientId}/invite-portal`);
export const getClientPortalInviteStatus = (clientId)       => api.get(`/ca/clients/${clientId}/invite-portal`);
export const getClientPortalInviteInfo   = (token)          => api.get(`/client-invites/${token}`);
export const acceptClientPortalInvite    = (token, data)    => api.post(`/client-invites/${token}/accept`, data);

// ── Approvals ─────────────────────────────────────────────────────────────────
export const sendApproval         = (filingId)                  => api.post("/approvals/send", { filingId });
export const getApprovalSummary   = (token)                     => api.get(`/approvals/${token}`);
export const respondToApproval    = (token, action, comment)    => api.post(`/approvals/${token}/respond`, { action, comment });
