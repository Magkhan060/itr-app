import React from "react";
import { Typography, theme as antdTheme } from "antd";
import {
  FileDoneOutlined, SafetyCertificateOutlined,
  CloudServerOutlined, AuditOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const FEATURES = [
  { icon: <AuditOutlined />,             text: "File your ITR-1 online — built for CAs and individuals" },
  { icon: <SafetyCertificateOutlined />, text: "PAN & Aadhaar encrypted at rest (AES-256)"  },
  { icon: <CloudServerOutlined />,       text: "Form 16 upload, parsed and pre-filled"      },
  { icon: <FileDoneOutlined />,          text: "Old vs New regime instant comparison"        },
];

// Shared split-screen shell for every pre-auth page (Register, JoinFirm,
// JoinClientPortal — Login.jsx keeps its own copy of this exact markup since
// it's the reference/source of truth this component was copied from; it is
// deliberately NOT refactored to use this component, so it never depends on
// anything that could change here). Branded left panel content is identical
// everywhere on purpose — these are all entry points into the same product,
// not separate flows that need their own marketing copy.
//
// `maxWidth` lets a taller/wider right-panel form (e.g. a multi-step wizard)
// use a bit more horizontal room than Login's single two-field form without
// needing its own bespoke layout.
export default function AuthSplitLayout({ children, maxWidth = 400 }) {
  const { token } = antdTheme.useToken();

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* ── Left branded panel — same surface color as the right panel in
          both light and dark mode, with the brand blue used only as an
          accent (icons, badges) so the two halves read as one cohesive
          page rather than a jarring static-blue / neutral-gray split. ── */}
      <div
        style={{
          flex: "0 0 45%",
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 56px",
          position: "relative",
          overflow: "hidden",
        }}
        className="hidden lg:flex"
      >
        {/* Decorative glow — subtle brand-color tint, adapts to theme via colorPrimary */}
        <div
          style={{
            position: "absolute", top: -120, right: -120, zIndex: 0,
            width: 360, height: 360, borderRadius: "50%",
            background: `radial-gradient(circle, ${token.colorPrimaryBg} 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute", bottom: -160, left: -100, zIndex: 0,
            width: 320, height: 320, borderRadius: "50%",
            background: `radial-gradient(circle, ${token.colorPrimaryBg} 0%, transparent 70%)`,
          }}
        />

        <div style={{ marginBottom: 48, position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: token.colorPrimaryBg,
              border: `1px solid ${token.colorPrimaryBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <FileDoneOutlined style={{ fontSize: 28, color: token.colorPrimary }} />
          </div>
          <Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
            ITR Filing Portal
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            Secure, simple Indian tax filing — FY 2025-26
          </Text>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48, position: "relative", zIndex: 1 }}>
          {FEATURES.map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <Text style={{ fontSize: 15 }}>{text}</Text>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderRadius: 10,
            background: token.colorFillTertiary,
            border: `1px solid ${token.colorBorderSecondary}`,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>Assessment Year</Text>
          <div>
            <Text strong style={{ fontSize: 18 }}>AY 2026-27</Text>
            <Text type="secondary" style={{ fontSize: 13, marginLeft: 10 }}>
              FY 2025-26
            </Text>
          </div>
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: token.colorBgContainer,
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth }}>
          {/* Mobile-only logo — shown when the left panel is hidden below the lg breakpoint */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <FileDoneOutlined style={{ fontSize: 36, color: token.colorPrimary }} />
            <Title level={3} style={{ marginTop: 10, marginBottom: 2 }}>ITR Filing Portal</Title>
            <Text type="secondary">FY 2025-26 | AY 2026-27</Text>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
