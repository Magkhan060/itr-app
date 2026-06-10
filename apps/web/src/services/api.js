import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("itr_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || "Network error";
    return Promise.reject(new Error(message));
  }
);

export default api;
