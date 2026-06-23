import { theme as antdThemeApi } from "antd";

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

export const sharedTokens = {
  colorPrimary: COLORS.primary,
  colorSuccess: COLORS.success,
  colorWarning: COLORS.warning,
  colorError:   COLORS.danger,
  colorInfo:    COLORS.info,
  borderRadius: RADIUS,
  fontFamily:   FONT_FAMILY,
};

export const sharedComponents = {
  Button: { borderRadius: 8, controlHeight: 38 },
  Input:  { borderRadius: 8 },
  Card:   { borderRadiusLG: RADIUS },
  // Slightly smaller than the 14px base — a touch more refined for the
  // app's dense multi-field forms (ClientForm, ITR1/ITR2 wizards) without
  // needing per-page overrides. Labels were never actually bold (ANTD's
  // default Form label has no font-weight override at all); they just
  // looked heavy next to size="large" inputs, which those forms no longer use.
  Form: { labelFontSize: 13 },
};

// Dark mode is a deliberate black/charcoal-gray palette, not ANTD's stock
// dark-navy defaults — only colorBgLayout/colorBgContainer/colorBgElevated
// are overridden; everything else (colorPrimary, etc.) inherits from
// sharedTokens so the brand accent color stays identical in both modes.
const darkOverrides = {
  colorBgLayout:    "#000000",
  colorBgContainer: "#141414",
  colorBgElevated:  "#1f1f1f",
  colorBorder:       "#303030",
  colorBorderSecondary: "#262626",
};

export const getThemeConfig = (mode) => ({
  algorithm: mode === "dark" ? antdThemeApi.darkAlgorithm : antdThemeApi.defaultAlgorithm,
  token: mode === "dark" ? { ...sharedTokens, ...darkOverrides } : sharedTokens,
  components: sharedComponents,
});

// Back-compat default export (light mode) for any code that hasn't switched
// to getThemeConfig(mode) yet.
export const antdTheme = getThemeConfig("light");
