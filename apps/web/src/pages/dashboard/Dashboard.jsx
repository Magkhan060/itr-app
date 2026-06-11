import React from "react";
import {
  Row, Col, Card, Statistic, Tag, Typography,
  Table, Button, Alert, Progress,
} from "antd";
import {
  FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileDoneOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import { FLAGS } from "../../config/features.config.js";

const { Title, Text } = Typography;

const enabledForms = Object.entries(FLAGS)
  .filter(([k, v]) => k.startsWith("ITR_") && v.enabled)
  .map(([key, val]) => ({ key, ...val }));

const columns = [
  { title: "Form",    dataIndex: "label",   key: "label" },
  {
    title:  "Status",
    key:    "status",
    render: () => <Tag color="default">Not Started</Tag>,
  },
  {
    title:  "Action",
    key:    "action",
    render: (_, record) => (
      <Button type="link" size="small" icon={<ArrowRightOutlined />}>
        Start Filing
      </Button>
    ),
  },
];

export default function Dashboard() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();

  return (
    <div>
      {/* Welcome banner */}
      <Alert
        message={
          <Text>
            Welcome back, <Text strong>{user?.fullName || "Taxpayer"}</Text>!
            Filing for <Text strong>FY 2025-26 (AY 2026-27)</Text> is open.
          </Text>
        }
        type="info"
        showIcon
        icon={<FileDoneOutlined />}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="Forms Available"
              value={enabledForms.length}
              prefix={<FileTextOutlined style={{ color: "#1677ff" }} />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="Filed This Year"
              value={0}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="In Progress"
              value={0}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="Refund Status"
              value="—"
              valueStyle={{ color: "#8c8c8c" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Available ITR forms */}
        <Col xs={24} lg={14}>
          <Card
            title="Available ITR Forms"
            bordered={false}
            style={{ borderRadius: 10 }}
            extra={<Tag color="blue">AY 2026-27</Tag>}
          >
            <Table
              dataSource={enabledForms}
              columns={columns}
              rowKey="key"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        {/* Feature flags panel */}
        <Col xs={24} lg={10}>
          <Card
            title="Platform Features"
            bordered={false}
            style={{ borderRadius: 10 }}
          >
            {Object.entries(FLAGS).map(([key, flag]) => (
              <div
                key={key}
                className="flex justify-between items-center py-2"
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                <Text style={{ fontSize: 13 }}>{flag.label}</Text>
                <Tag color={flag.enabled ? "success" : "default"}>
                  {flag.enabled ? "Active" : "Disabled"}
                </Tag>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
