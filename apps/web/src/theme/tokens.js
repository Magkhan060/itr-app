// Single source of truth for the app's visual design tokens.
// Imported by both the ANTD ConfigProvider (main.jsx) and Tailwind
// (tailwind.config.js) so utility classes and ANTD components never drift
// apart. Keeping colorPrimary at ANTD's stock blue intentionally — it's
// already hardcoded inline in dozens of components throughout the app;
// changing the hex itself would require a much larger find/replace pass.
// This file centralizes the *decision*, not (yet) a recolor.

export const COLORS = {
  primary: "#1677ff",
  success: "#52c41a",
  warning: "#faad14",
  danger:  "#ff4d4f",
  info:    "#13c2c2",
};

// 10px is already the de facto standard sprinkled across Card styles
// throughout the app (`style={{ borderRadius: 10 }}`) — centralizing it
// here makes every ANTD component (Button, Input, Modal, etc.) consistent
// with what Cards already do, instead of using ANTD's default 6px.
export const RADIUS = 10;

export const FONT_FAMILY =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const antdTheme = {
  token: {
    colorPrimary:  COLORS.primary,
    colorSuccess:  COLORS.success,
    colorWarning:  COLORS.warning,
    colorError:    COLORS.danger,
    colorInfo:     COLORS.info,
    borderRadius:  RADIUS,
    fontFamily:    FONT_FAMILY,
    colorBgLayout: "#f5f7fa",
  },
  components: {
    Button: { borderRadius: 8, controlHeight: 38 },
    Input:  { borderRadius: 8 },
    Card:   { borderRadiusLG: RADIUS },
  },
};
