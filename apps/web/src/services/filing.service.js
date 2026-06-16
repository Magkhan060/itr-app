import api from "./api.js";

export const saveDraft          = (data) => api.post("/filing/draft", data);
export const submitITR1         = (data) => api.post("/filing/itr1",  data);
export const getMyFilings       = ()     => api.get("/filing");
export const getFilingById      = (id)   => api.get(`/filing/${id}`);
export const downloadFilingXML  = (id)   => api.get(`/filing/${id}/xml`, { responseType: "blob" });
