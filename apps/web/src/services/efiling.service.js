import api from "./api.js";

export const generateEVC  = (data)          => api.post("/efiling/generate-evc", data);
export const validateEVC  = (data)          => api.post("/efiling/validate-evc", data);
export const submitReturn = (data)          => api.post("/efiling/submit",        data);
export const downloadXML  = (filingId)      => api.get(`/efiling/${filingId}/xml`, { responseType: "blob" });
