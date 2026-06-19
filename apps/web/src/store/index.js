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

export const useFlagsStore = create((set) => ({
  flags: {},
  setFlags: (flagsArray) => {
    const map = Object.fromEntries(flagsArray.map((f) => [f.key, f.enabled]));
    set({ flags: map });
  },
  // Granular update — lets the Admin Flags page reflect a toggle app-wide
  // (sidebar nav, Dashboard quick actions) without requiring a full page reload.
  setFlag: (key, enabled) =>
    set((state) => ({ flags: { ...state.flags, [key]: enabled } })),
}));

export const useThemeStore = create((set, get) => ({
  mode: localStorage.getItem("itr_theme_mode") || "light",
  toggleMode: () => {
    const next = get().mode === "dark" ? "light" : "dark";
    localStorage.setItem("itr_theme_mode", next);
    set({ mode: next });
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
