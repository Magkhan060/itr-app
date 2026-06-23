import React from "react";
import { theme as antdTheme } from "antd";

// Small-caps, letter-spaced section label for breaking a long form into
// named groups (Identity / Contact / Salary Income / etc.) — reads as a
// clear section break at a glance without competing in size/weight with the
// Form.Item labels directly below it. A plain Typography.Title level={5}
// (ANTD's default: ~16px, fontWeightStrong/600) sits in the same size
// family as field labels and ends up looking like an oversized, bold label
// rather than a section divider — this is deliberately smaller (12px) so
// the boldness/letter-spacing reads as a typographic treatment, not as
// "everything in this form is too big."
export default function FormSectionTitle({ children, first }) {
  const { token } = antdTheme.useToken();
  return (
    <div
      style={{
        marginTop:    first ? 0 : 28,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        fontSize:   12,
        fontWeight: 600,
        color:      token.colorTextSecondary,
      }}
    >
      {children}
    </div>
  );
}
