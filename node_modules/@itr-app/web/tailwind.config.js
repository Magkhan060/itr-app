import { COLORS } from "./src/theme/tokens.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  corePlugins: {
    preflight: false,   // ← Critical: prevents ANTD style conflicts
  },
  theme: {
    extend: {
      colors: {
        primary: COLORS.primary,  // Shared with ConfigProvider — see src/theme/tokens.js
        success: COLORS.success,
        warning: COLORS.warning,
        danger:  COLORS.danger,
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
