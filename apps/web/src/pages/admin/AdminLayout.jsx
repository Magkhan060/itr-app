import React from "react";
import { Tabs, Typography } from "antd";
import {
  DashboardOutlined, UserOutlined, SettingOutlined,
} from "@ant-design/icons";
import AdminDashboard  from "./AdminDashboard.jsx";
import AdminUsers      from "./AdminUsers.jsx";
import AdminFlags      from "./AdminFlags.jsx";

const { Title } = Typography;

export default function AdminLayout() {
  const tabs = [
    {
      key:      "dashboard",
      label:    <span><DashboardOutlined /> Overview</span>,
      children: <AdminDashboard />,
    },
    {
      key:      "users",
      label:    <span><UserOutlined /> Users</span>,
      children: <AdminUsers />,
    },
    {
      key:      "flags",
      label:    <span><SettingOutlined /> Feature Flags</span>,
      children: <AdminFlags />,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>Admin Panel</Title>
        <Typography.Text type="secondary">
          Platform management — ITR Filing App
        </Typography.Text>
      </div>
      <Tabs defaultActiveKey="dashboard" items={tabs} size="large" />
    </div>
  );
}
