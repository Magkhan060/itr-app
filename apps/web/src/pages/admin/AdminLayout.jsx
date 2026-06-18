import React from "react";
import { Tabs, Typography, Space, Tag } from "antd";
import {
  DashboardOutlined, TeamOutlined, ControlOutlined, AuditOutlined,
  FileTextOutlined, CrownOutlined,
} from "@ant-design/icons";
import AdminDashboard from "./AdminDashboard.jsx";
import AdminUsers     from "./AdminUsers.jsx";
import AdminFlags     from "./AdminFlags.jsx";
import AdminAuditLog  from "./AdminAuditLog.jsx";
import Dashboard      from "../dashboard/Dashboard.jsx";
import PageHeader     from "../../components/PageHeader.jsx";

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
  {
    key:      "file-itr",
    label:    <Space><FileTextOutlined /> File ITR</Space>,
    // Admins are also individual taxpayers — reuse the same taxpayer dashboard
    // here rather than maintaining a second copy that drifts out of sync.
    children: <Dashboard />,
  },
];

export default function AdminLayout() {
  return (
    <div>
      <PageHeader
        icon={<CrownOutlined />}
        color="#faad14"
        title="Admin Panel"
        subtitle={<Tag color="gold">Platform Management</Tag>}
      />
      <Tabs defaultActiveKey="dashboard" items={TABS} size="large" />
    </div>
  );
}
