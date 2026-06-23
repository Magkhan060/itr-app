import api from "./api.js";

export const getPortalFilings        = ()   => api.get("/client-portal/filings");
export const getPortalFilingById     = (id) => api.get(`/client-portal/filings/${id}`);
export const downloadPortalFilingXML = (id) => api.get(`/client-portal/filings/${id}/xml`, { responseType: "blob" });
export const getPortalRefundStatus   = (id) => api.get(`/client-portal/filings/${id}/refund`);
