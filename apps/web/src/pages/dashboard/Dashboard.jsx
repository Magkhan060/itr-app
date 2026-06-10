import React from "react";
import { Card, Tag, Typography } from "antd";
import { FLAGS } from "../../config/features.config.js";

const { Title, Text } = Typography;

export default function Dashboard() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Title level={2}>ITR Filing Dashboard</Title>
      <Text type="secondary">FY 2025-26 | AY 2026-27</Text>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {Object.entries(FLAGS).map(([key, flag]) => (
          <Card key={key} size="small" className="rounded-lg">
            <div className="flex justify-between items-center">
              <Text>{flag.label}</Text>
              <Tag color={flag.enabled ? "success" : "default"}>
                {flag.enabled ? "Enabled" : "Disabled"}
              </Tag>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
