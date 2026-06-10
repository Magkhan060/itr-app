/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  corePlugins: {
    preflight: false,   // ← Critical: prevents ANTD style conflicts
  },
  theme: {
    extend: {
      colors: {
        primary: "#1677ff",  // Match ANTD primary blue
        success: "#52c41a",
        warning: "#faad14",
        danger:  "#ff4d4f",
      },
    },
  },
  plugins: [],
};
