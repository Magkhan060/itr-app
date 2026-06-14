import api from "./api.js";

export const computeTax   = (data) => api.post("/tax/compute", data);
export const compareRegimes = (data) => api.post("/tax/compare", data);
export const computeAdvanceTax = (data) => api.post("/tax/advance-tax", data);

