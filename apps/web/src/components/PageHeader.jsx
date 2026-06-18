import React from "react";
import { Typography, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

/**
 * Shared page header — icon badge (or Back button) + title + subtitle + optional
 * right-aligned actions. Centralizing this gives every page the same visual
 * treatment instead of each one hand-rolling its own icon/title/subtitle markup.
 */
export default function PageHeader({ icon, title, subtitle, color = "#1677ff", onBack, extra }) {
  return (
    <div className="flex items-center justify-between mb-6" style={{ flexWrap: "wrap", gap: 12 }}>
      <div className="flex items-center gap-3">
        {onBack && (
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
        )}
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
        <div>
          <Title level={3} style={{ margin: 0 }}>{title}</Title>
          {subtitle && (
            typeof subtitle === "string"
              ? <Text type="secondary">{subtitle}</Text>
              : subtitle
          )}
        </div>
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
}
