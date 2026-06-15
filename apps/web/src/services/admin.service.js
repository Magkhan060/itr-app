import api from "./api.js";

export const getAdminStats    = ()           => api.get("/admin/stats");
export const getAllUsers       = (params)     => api.get("/admin/users", { params });
export const updateUserRole    = (id, role)   => api.patch(`/admin/users/${id}/role`,   { role });
export const toggleUserActive  = (id, active) => api.patch(`/admin/users/${id}/active`, { isActive: active });
export const getAllFlags        = ()           => api.get("/features");
export const toggleFlag        = (key, enabled) => api.patch(`/features/${key}/toggle`, { enabled });
