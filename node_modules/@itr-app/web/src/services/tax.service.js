import api from "./api.js";

export const computeTax   = (data) => api.post("/tax/compute", data);
export const compareRegimes = (data) => api.post("/tax/compare", data);
