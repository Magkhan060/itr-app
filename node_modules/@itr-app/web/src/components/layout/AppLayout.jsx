import React, { useState } from "react";
import { Layout, Menu, Avatar, Dropdown, Typography, Tag, Button } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileDoneOutlined,
  CalendarOutlined,
  BankOutlined,
  // SettingOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore, useFlagsStore } from "../../store/index.js";
import { FLAGS } from "../../config/features.config.js";
import { SettingOutlined } from "@ant-design/icons";

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const NAV_ITEMS = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
    flag: null,
  },
  {
    key: "/filing",
    icon: <FileTextOutlined />,
    label: "File Return",
    flag: null,
    children: [
      { key: "/filing/itr1", label: "ITR-1 (Salaried)",    flag: "ITR_1" },
      { key: "/filing/itr2", label: "ITR-2 (Capital Gains)", flag: "ITR_2" },
      { key: "/filing/itr3", label: "ITR-3 (Business)",    flag: "ITR_3" },
      { key: "/filing/itr4", label: "ITR-4 (Presumptive)", flag: "ITR_4" },
      { key: "/filing/itr5", label: "ITR-5 (Firms/LLP)",   flag: "ITR_5" },
      { key: "/filing/itr6", label: "ITR-6 (Companies)",   flag: "ITR_6" },
      { key: "/filing/itr7", label: "ITR-7 (Trusts/NGOs)", flag: "ITR_7" },
    ],
  },
  {
    key: "/calculator",
    icon: <CalculatorOutlined />,
    label: "Tax Calculator",
    flag: "REGIME_COMPARISON",
  },
  {
  key:   "/advance-tax",
  icon:  <CalendarOutlined />,
  label: "Advance Tax",
  flag:  "ADVANCE_TAX_CALC",
  },
  {
  key:   "/refund-tracker",
  icon:  <BankOutlined />,
  label: "Refund Tracker",
  flag:  "REFUND_TRACKER",
  },
  {
    key: "/profile",
    icon: <UserOutlined />,
    label: "My Profile",
    flag: null,
  },
  {
  key:   "/admin",
  icon:  <SettingOutlined />,
  label: "Admin Panel",
  flag:  null,
  adminOnly: true,
},
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const liveFlags = useFlagsStore((s) => s.flags);
  const isEnabled = (key) =>
    Object.keys(liveFlags).length > 0
      ? (liveFlags[key] ?? false)
      : (FLAGS[key]?.enabled ?? false);

  // Build menu items respecting feature flags
  const buildMenuItems = (items) =>
  items
    .filter((item) => {
      if (item.adminOnly && user?.role !== "admin") return false;
      if (item.flag && !isEnabled(item.flag)) return false;

      return true;
    })
    .map((item) => ({
      key:      item.key,
      icon:     item.icon,
      label:    item.label,
      children: item.children ? buildMenuItems(item.children) : undefined,
    }));

  const menuItems = buildMenuItems(NAV_ITEMS);

  const userMenuItems = [
    {
      key:   "profile",
      icon:  <UserOutlined />,
      label: "My Profile",
      onClick: () => navigate("/profile"),
    },
    { type: "divider" },
    {
      key:     "logout",
      icon:    <LogoutOutlined />,
      label:   "Sign Out",
      danger:  true,
      onClick: logout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* ── Sider ─────────────────────────────────────── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
        style={{ position: "fixed", height: "100vh", left: 0, top: 0, zIndex: 100 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center py-4 px-3 border-b border-gray-700">
          <FileDoneOutlined style={{ fontSize: 24, color: "#1677ff" }} />
          {!collapsed && (
            <Text strong style={{ color: "#fff", marginLeft: 10, fontSize: 16 }}>
              ITR Filing
            </Text>
          )}
        </div>

        {/* AY Badge */}
        {!collapsed && (
          <div className="flex justify-center py-2">
            <Tag color="blue">AY 2026-27</Tag>
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={["/filing"]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      {/* ── Main Layout ───────────────────────────────── */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: "all 0.2s" }}>
        {/* Header */}
        <Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 99,
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar style={{ backgroundColor: "#1677ff" }} icon={<UserOutlined />} />
              {user && (
                <div className="flex flex-col leading-tight">
                  <Text strong style={{ fontSize: 13 }}>{user.fullName}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{user.pan}</Text>
                </div>
              )}
            </div>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content style={{ margin: "24px", minHeight: "calc(100vh - 134px)" }}>
          <Outlet />
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: "center", background: "#f5f5f5", padding: "12px 24px" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ITR Filing App © 2026 | FY 2025-26 | AY 2026-27 | Data encrypted & secure
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
}
