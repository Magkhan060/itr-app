import api from "./api.js";

export const uploadDocument = (formData) =>
  api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getMyDocuments = () => api.get("/documents");
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
