import React from "react";
import { Tabs, Typography, Space, Tag } from "antd";
import {
  DashboardOutlined, TeamOutlined, ControlOutlined, AuditOutlined,
} from "@ant-design/icons";
import AdminDashboard from "./AdminDashboard.jsx";
import AdminUsers     from "./AdminUsers.jsx";
import AdminFlags     from "./AdminFlags.jsx";
import AdminAuditLog  from "./AdminAuditLog.jsx";

const { Title } = Typography;

const TABS = [
  {
    key:      "dashboard",
    label:    <Space><DashboardOutlined /> Overview</Space>,
    children: <AdminDashboard />,
  },
  {
    key:      "users",
    label:    <Space><TeamOutlined /> Users</Space>,
    children: <AdminUsers />,
  },
  {
    key:      "flags",
    label:    <Space><ControlOutlined /> Feature Flags</Space>,
    children: <AdminFlags />,
  },
  {
    key:      "audit",
    label:    <Space><AuditOutlined /> Audit Log</Space>,
    children: <AdminAuditLog />,
  },
];

export default function AdminLayout() {
  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "baseline", gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>Admin Panel</Title>
        <Tag color="gold">Platform Management</Tag>
      </div>
      <Tabs defaultActiveKey="dashboard" items={TABS} size="large" />
    </div>
  );
}
