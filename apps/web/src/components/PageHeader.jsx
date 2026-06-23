import React from "react";
import { Typography, Button, Tag, Card, theme as antdTheme } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { CURRENT_FY, CURRENT_AY } from "@itr-app/shared-types";

const { Title, Text } = Typography;

/**
 * Shared page header — icon badge + title + subtitle + optional FY/AY period
 * badge + optional right-aligned actions, inside a theme-aware Card.
 * Centralizing this gives every page the same visual treatment instead of
 * each one hand-rolling its own icon/title/subtitle markup.
 *
 * Deliberately uses inline `style={{ display: "flex", ... }}` rather than
 * Tailwind's `className="flex ..."` for this component specifically — even
 * though Tailwind is correctly wired up now, a shared layout primitive used
 * on every page is exactly the place where "guaranteed to render correctly
 * regardless of the CSS pipeline" is worth the extra verbosity.
 *
 * `period`: pages used to bury "FY 2025-26 | AY 2026-27" as plain text
 * inside their `subtitle` string, inconsistently (some used " | ", others
 * " · ", some only AY, some both). Passing `period` renders it as a single
 * blue Tag instead — set it to `true` for the current global FY/AY, or pass
 * a string for a filing-specific period (e.g. a particular Filing's
 * assessmentYear) when the page isn't talking about "now".
 *
 * `backAlign`: Back sits to the left of the icon/title by default (the
 * conventional position). Pass "right" to instead render it on the far
 * right, alongside `extra` — useful on pages where the title side is
 * already busy (e.g. a long client name) and Back reads better as a
 * dedicated action on the opposite edge of the card.
 */
export default function PageHeader({
  icon, title, subtitle, color = "#1677ff", onBack, extra, period, backAlign = "left",
}) {
  const { token } = antdTheme.useToken();
  const periodLabel = period === true
    ? `FY ${CURRENT_FY} · AY ${CURRENT_AY}`
    : period;

  const backButton = onBack && (
    <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
  );

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 10, marginBottom: 24, background: token.colorBgContainer }}
      styles={{ body: { padding: "16px 20px" } }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
          {backAlign === "left" && backButton}
          {icon && (
            <div
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 3px 8px ${color}40`,
              }}
            >
              {React.cloneElement(icon, { style: { fontSize: 20, color: "#fff" } })}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Title level={3} style={{ margin: 0 }}>{title}</Title>
              {periodLabel && <Tag color="blue">{periodLabel}</Tag>}
            </div>
            {subtitle && (
              typeof subtitle === "string"
                ? <Text type="secondary">{subtitle}</Text>
                : subtitle
            )}
          </div>
        </div>
        {(extra || (backAlign === "right" && backButton)) && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {extra}
            {backAlign === "right" && backButton}
          </div>
        )}
      </div>
    </Card>
  );
}
