import React, { useState } from "react";
import {
  Layout, Menu, Avatar, Dropdown, Typography, Tag, Button, Breadcrumb,
} from "antd";
import {
  DashboardOutlined, FileTextOutlined, CalculatorOutlined,
  UserOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  FileDoneOutlined, CalendarOutlined, BankOutlined, SettingOutlined,
  BellOutlined, CrownOutlined, TeamOutlined, AuditOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { useAuthStore, useFlagsStore } from "../../store/index.js";
import { FLAGS } from "../../config/features.config.js";

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const NAV_ITEMS = [
  { key: "/dashboard",     icon: <DashboardOutlined />, label: "Dashboard",      flag: null },
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
  { key: "/calculator",    icon: <CalculatorOutlined />, label: "Tax Calculator", flag: "REGIME_COMPARISON" },
  { key: "/advance-tax",   icon: <CalendarOutlined />,   label: "Advance Tax",    flag: "ADVANCE_TAX_CALC"  },
  { key: "/refund-tracker",icon: <BankOutlined />,       label: "Refund Tracker", flag: "REFUND_TRACKER"    },
  { key: "/profile",       icon: <UserOutlined />,       label: "My Profile",     flag: null },
  { key: "/admin",         icon: <SettingOutlined />,    label: "Admin Panel",    flag: null, adminOnly: true },
  // CA Portal nav items — only visible to CA role users
  { key: "/ca/dashboard",  icon: <AuditOutlined />,      label: "CA Dashboard",   flag: "CA_PORTAL", caOnly: true },
  { key: "/ca/clients",    icon: <TeamOutlined />,        label: "My Clients",     flag: "CA_PORTAL", caOnly: true },
];

// Breadcrumb map — path → [crumbs]
const BREADCRUMBS = {
  "/dashboard":      [{ title: "Dashboard" }],
  "/filing/itr1":    [{ title: "File Return" }, { title: "ITR-1 (Sahaj)" }],
  "/filing/itr2":    [{ title: "File Return" }, { title: "ITR-2" }],
  "/filing/itr3":    [{ title: "File Return" }, { title: "ITR-3" }],
  "/filing/itr4":    [{ title: "File Return" }, { title: "ITR-4" }],
  "/calculator":     [{ title: "Tax Calculator" }],
  "/advance-tax":    [{ title: "Advance Tax" }],
  "/refund-tracker": [{ title: "Refund Tracker" }],
  "/profile":        [{ title: "My Profile" }],
  "/admin":          [{ title: "Admin Panel" }],
  "/ca/dashboard":   [{ title: "CA Dashboard" }],
  "/ca/clients":     [{ title: "CA Dashboard" }, { title: "Clients" }],
  "/ca/clients/new": [{ title: "CA Dashboard" }, { title: "Add Client" }],
};

const initials = (name) =>
  name
    ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "U";

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

  const buildMenuItems = (items) =>
    items
      .filter((item) => {
        if (item.adminOnly && user?.role !== "admin") return false;
        if (item.caOnly   && user?.role !== "ca")     return false;
        if (item.flag && !isEnabled(item.flag))       return false;
        return true;
      })
      .map((item) => ({
        key:      item.key,
        icon:     item.icon,
        label:    item.label,
        children: item.children ? buildMenuItems(item.children) : undefined,
      }));

  const menuItems = buildMenuItems(NAV_ITEMS);

  const crumbs = BREADCRUMBS[location.pathname] || [{ title: "—" }];

  const userMenuItems = [
    {
      key:     "header",
      type:    "group",
      label: (
        <div style={{ padding: "4px 0 8px" }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.fullName}</div>
          <div style={{ color: "#8c8c8c", fontSize: 11 }}>{user?.pan}</div>
          {user?.role === "admin" && (
            <Tag color="gold" icon={<CrownOutlined />} style={{ marginTop: 4, fontSize: 10 }}>
              Admin
            </Tag>
          )}
        </div>
      ),
    },
    { type: "divider" },
    { key: "profile", icon: <UserOutlined />, label: "My Profile", onClick: () => navigate("/profile") },
    { type: "divider" },
    { key: "logout",  icon: <LogoutOutlined />, label: "Sign Out", danger: true, onClick: logout },
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
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <FileDoneOutlined style={{ fontSize: 22, color: "#1677ff", flexShrink: 0 }} />
          {!collapsed && (
            <Text strong style={{ color: "#fff", marginLeft: 10, fontSize: 15, whiteSpace: "nowrap" }}>
              ITR Filing
            </Text>
          )}
        </div>

        {/* AY badge */}
        {!collapsed && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
            <Tag color="blue" style={{ fontSize: 11 }}>AY 2026-27</Tag>
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={["/filing"]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 4 }}
        />

        {/* Bottom user strip */}
        {!collapsed && (
          <div
            style={{
              position: "absolute", bottom: 48, left: 0, right: 0,
              padding: "10px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <Avatar
              size={32}
              style={{ backgroundColor: "#1677ff", fontSize: 13, flexShrink: 0 }}
            >
              {initials(user?.fullName)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.fullName}
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>
                {user?.role === "admin" ? "Admin" : user?.role === "ca" ? "CA / Tax Professional" : "Taxpayer"}
              </div>
            </div>
          </div>
        )}
      </Sider>

      {/* ── Main Layout ───────────────────────────────── */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: "all 0.2s" }}>
        {/* Header */}
        <Header
          style={{
            position: "sticky", top: 0, zIndex: 99,
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            height: 56,
          }}
        >
          {/* Left: collapse toggle + breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: "#595959" }}
            />
            <Breadcrumb
              items={[{ title: <Link to="/dashboard" style={{ color: "#8c8c8c", fontSize: 13 }}>Home</Link> }, ...crumbs]}
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Right: bell + user avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              type="text"
              icon={<BellOutlined style={{ fontSize: 18 }} />}
              style={{ color: "#595959", width: 40, height: 40 }}
            />

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow trigger={["click"]}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}
                className="hover:bg-gray-50"
              >
                <Avatar
                  size={34}
                  style={{ backgroundColor: user?.role === "admin" ? "#faad14" : "#1677ff", fontSize: 13 }}
                >
                  {initials(user?.fullName)}
                </Avatar>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.fullName}</div>
                  <div style={{ color: "#8c8c8c", fontSize: 11 }}>
                    {user?.role === "admin" ? "Admin" : user?.pan}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content style={{ margin: "24px", minHeight: "calc(100vh - 110px)" }}>
          <Outlet />
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: "center", background: "#f5f5f5", padding: "10px 24px" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ITR Filing App © 2026 &nbsp;·&nbsp; FY 2025-26 &nbsp;·&nbsp; AY 2026-27 &nbsp;·&nbsp; All data encrypted &amp; secure
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
}
