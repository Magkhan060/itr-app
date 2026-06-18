import React, { useState } from "react";
import {
  Layout, Menu, Avatar, Dropdown, Typography, Tag, Button, Breadcrumb,
} from "antd";
import {
  DashboardOutlined, UserOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, FileDoneOutlined,
  BellOutlined, CrownOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { useAuthStore, useFlagsStore } from "../../store/index.js";
import { FLAGS } from "../../config/features.config.js";

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const ROLE_LABEL = {
  platform_admin: "Admin",
  ca_admin:       "CA Admin",
  ca_staff:       "CA Team Member",
  ca_readonly:    "CA (Read-Only)",
  taxpayer:       "Taxpayer",
};

// Left nav is intentionally minimal — Dashboard renders role-specific content
// (taxpayer / CA Portal / Admin Panel), so there's nothing else that needs a
// permanent slot here. Tax Calculator, Advance Tax, Refund Tracker, and the
// ITR-1..7 filing pages are all still real routes — reachable via tiles/links
// on the Dashboard itself, just not pinned to the sidebar.
const NAV_ITEMS = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard",  flag: null },
  { key: "/profile",   icon: <UserOutlined />,      label: "My Profile", flag: null },
];

// Breadcrumb map — path → [crumbs]. Only routes still reachable as standalone
// pages need an entry; /admin, /ca/dashboard, /ca/clients now redirect to /dashboard.
const BREADCRUMBS = {
  "/dashboard":      [{ title: "Dashboard" }],
  "/filing/itr1":    [{ title: "File Return" }, { title: "ITR-1 (Sahaj)" }],
  "/calculator":     [{ title: "Tax Calculator" }],
  "/advance-tax":    [{ title: "Advance Tax" }],
  "/refund-tracker": [{ title: "Refund Tracker" }],
  "/profile":        [{ title: "My Profile" }],
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
      .filter((item) => !item.flag || isEnabled(item.flag))
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
          {user?.role === "platform_admin" && (
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
          <div
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #1677ff, #0958d9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(22, 119, 255, 0.4)",
            }}
          >
            <FileDoneOutlined style={{ fontSize: 18, color: "#fff" }} />
          </div>
          {!collapsed && (
            <div style={{ marginLeft: 10, lineHeight: 1.25 }}>
              <Text strong style={{ color: "#fff", fontSize: 15, whiteSpace: "nowrap", display: "block" }}>
                ITR Filing
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, whiteSpace: "nowrap" }}>
                Tax made simple
              </Text>
            </div>
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
                {ROLE_LABEL[user?.role] || "Taxpayer"}
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
                  style={{ backgroundColor: user?.role === "platform_admin" ? "#faad14" : "#1677ff", fontSize: 13 }}
                >
                  {initials(user?.fullName)}
                </Avatar>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.fullName}</div>
                  <div style={{ color: "#8c8c8c", fontSize: 11 }}>
                    {user?.role === "platform_admin" ? "Admin" : user?.pan}
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
