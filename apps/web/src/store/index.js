import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user:  null,
  token: localStorage.getItem("itr_token") || null,
  setUser:  (user)  => set({ user }),
  setToken: (token) => {
    localStorage.setItem("itr_token", token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("itr_token");
    set({ user: null, token: null });
  },
}));

export const useFilingStore = create((set) => ({
  currentITRType: null,
  filingData:     {},
  setITRType:     (type) => set({ currentITRType: type }),
  updateFiling:   (section, data) =>
    set((state) => ({
      filingData: { ...state.filingData, [section]: data },
    })),
  resetFiling:    () => set({ currentITRType: null, filingData: {} }),
}));
