import React, { useState, useEffect } from "react";
import {
  Row, Col, Card, Typography, Descriptions, Tag,
  Button, Table, Space, Statistic, Empty, Spin,
  theme as antdTheme,
} from "antd";
import {
  UserOutlined, FileTextOutlined, TeamOutlined,
  CrownOutlined, ArrowRightOutlined, FileDoneOutlined,
  CheckCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import { getMyFilings } from "../../services/filing.service.js";
import { listClients } from "../../services/ca.service.js";
import { getAdminStats } from "../../services/admin.service.js";
import PageHeader from "../../components/PageHeader.jsx";

const { Title, Text } = Typography;

const CA_ROLES = ["ca_admin", "ca_staff", "ca_readonly"];

const ROLE_LABEL = {
  taxpayer:       "Taxpayer",
  ca_admin:       "CA Admin",
  ca_staff:       "CA Team Member",
  ca_readonly:    "CA (Read-Only)",
  platform_admin: "Platform Admin",
};

const STATUS_COLOR = {
  draft:     "default",
  submitted: "blue",
  verified:  "green",
  processed: "purple",
};

export default function Profile() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const { token } = antdTheme.useToken();

  const isCA      = CA_ROLES.includes(user?.role);
  const isAdmin   = user?.role === "platform_admin";
  const isTaxpayer = !isCA && !isAdmin;

  const [filings, setFilings]   = useState([]);
  const [clients, setClients]   = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    const request = isTaxpayer
      ? getMyFilings().then((res) => setFilings(res.data || []))
      : isCA
        ? listClients().then((res) => setClients(res.data || []))
        : isAdmin
          ? getAdminStats().then((res) => setAdminStats(res.data))
          : Promise.resolve();

    request.catch(() => {}).finally(() => setLoading(false));
  }, [user?.role]);

  const draftCount     = filings.filter((f) => f.status === "draft").length;
  const submittedCount = filings.filter((f) => f.status !== "draft").length;

  const filingColumns = [
    { title: "Form",   dataIndex: "itrType",       key: "itrType", render: (v) => <Tag color="blue">{v}</Tag> },
    { title: "AY",     dataIndex: "assessmentYear", key: "ay" },
    { title: "Status", dataIndex: "status",         key: "status", render: (s) => <Tag color={STATUS_COLOR[s] || "default"}>{s?.toUpperCase()}</Tag> },
    {
      title: "Filed On", dataIndex: "submittedAt", key: "date",
      render: (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—",
    },
  ];

  const clientColumns = [
    { title: "Client", dataIndex: "fullName", key: "fullName" },
    { title: "PAN",     dataIndex: "pan",      key: "pan",  render: (v) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    {
      title: "Filing Status", key: "status",
      render: (_, r) => r.latestFiling
        ? <Tag color={STATUS_COLOR[r.latestFiling.status]}>{r.latestFiling.status?.toUpperCase()}</Tag>
        : <Tag>No Filing</Tag>,
    },
  ];

  // ── Quick-stat row — fourth stat is role-specific ──────────────────────────
  const roleStat = isTaxpayer
    ? { title: "Filings Submitted", value: submittedCount, icon: <CheckCircleOutlined />, color: "#52c41a" }
    : isCA
      ? { title: "Total Clients", value: clients.length, icon: <TeamOutlined />, color: "#722ed1" }
      : { title: "Platform Users", value: adminStats?.totalUsers ?? "—", icon: <TeamOutlined />, color: "#722ed1" };

  return (
    <div>
      <PageHeader
        icon={<UserOutlined />}
        title="My Profile"
        subtitle="Your account details and activity overview"
      />

      {/* Quick stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: "Role", value: ROLE_LABEL[user?.role] || "—", icon: <CrownOutlined />, color: "#1677ff", valueStyle: { fontSize: 18 } },
          { title: "PAN", value: user?.pan || "—", icon: <SafetyCertificateOutlined />, color: "#fa8c16", valueStyle: { fontSize: 18 } },
          { title: "Filing Period", value: "AY 2026-27", icon: <FileDoneOutlined />, color: "#13c2c2", valueStyle: { fontSize: 18 } },
          roleStat,
        ].map(({ title, value, icon, color, valueStyle }) => (
          <Col xs={12} sm={6} key={title}>
            <Card variant="borderless" style={{ borderRadius: 10 }} hoverable>
              <Statistic
                title={title}
                value={value}
                prefix={React.cloneElement(icon, { style: { color } })}
                valueStyle={{ color, ...(valueStyle || {}) }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        {/* ── Account Details ──────────────────────────── */}
        <Col xs={24} lg={10}>
          <Card
            variant="borderless"
            style={{ borderRadius: 10, height: "100%" }}
            title={
              <Space>
                <UserOutlined />
                <span>Account Details</span>
              </Space>
            }
          >
            <div className="flex justify-center mb-6">
              <div
                style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "#1677ff", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 32 }}>
                  {user?.fullName?.[0] || "U"}
                </Text>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Full Name">
                <Text strong>{user?.fullName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="PAN">
                <Tag color="blue">{user?.pan}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {user?.email}
              </Descriptions.Item>
              <Descriptions.Item label="Mobile">
                +91 {user?.mobile}
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {user?.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString("en-IN")
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Member Since">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN")
                  : "—"}
              </Descriptions.Item>
              {isCA && user?.caFirmName && (
                <Descriptions.Item label="Firm">
                  {user.caFirmName}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* ── Role-specific activity ───────────────────── */}
        <Col xs={24} lg={14}>
          {isTaxpayer && (
            <Card
              variant="borderless"
              style={{ borderRadius: 10, height: "100%" }}
              title={
                <Space>
                  <FileTextOutlined />
                  <span>My Filings</span>
                </Space>
              }
              extra={
                <Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate("/dashboard")} style={{ padding: 0 }}>
                  Go to Dashboard
                </Button>
              }
            >
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Card variant="borderless" style={{ borderRadius: 8, textAlign: "center", background: token.colorFillTertiary }}>
                    <Statistic title="Drafts in Progress" value={draftCount} valueStyle={{ color: "#faad14", fontSize: 22 }} prefix={<ClockCircleOutlined />} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card variant="borderless" style={{ borderRadius: 8, textAlign: "center", background: token.colorFillTertiary }}>
                    <Statistic title="Submitted" value={submittedCount} valueStyle={{ color: "#52c41a", fontSize: 22 }} prefix={<CheckCircleOutlined />} />
                  </Card>
                </Col>
              </Row>
              <Table
                dataSource={filings.slice(0, 5)}
                columns={filingColumns}
                rowKey="_id"
                loading={loading}
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="No filings yet" /> }}
              />
            </Card>
          )}

          {isCA && (
            <Card
              variant="borderless"
              style={{ borderRadius: 10, height: "100%" }}
              title={
                <Space>
                  <TeamOutlined />
                  <span>My Clients</span>
                </Space>
              }
              extra={
                <Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate("/dashboard")} style={{ padding: 0 }}>
                  Go to CA Dashboard
                </Button>
              }
            >
              <Table
                dataSource={clients.slice(0, 5)}
                columns={clientColumns}
                rowKey="_id"
                loading={loading}
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="No clients yet" /> }}
              />
            </Card>
          )}

          {isAdmin && (
            <Card
              variant="borderless"
              style={{ borderRadius: 10, height: "100%" }}
              title={
                <Space>
                  <CrownOutlined />
                  <span>Platform Overview</span>
                </Space>
              }
              extra={
                <Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate("/dashboard")} style={{ padding: 0 }}>
                  Go to Admin Panel
                </Button>
              }
            >
              {loading ? (
                <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
              ) : (
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Card variant="borderless" style={{ borderRadius: 8, textAlign: "center", background: token.colorFillTertiary }}>
                      <Statistic title="Total Users" value={adminStats?.totalUsers ?? "—"} valueStyle={{ color: "#1677ff", fontSize: 22 }} prefix={<TeamOutlined />} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card variant="borderless" style={{ borderRadius: 8, textAlign: "center", background: token.colorFillTertiary }}>
                      <Statistic title="Documents Uploaded" value={adminStats?.totalDocs ?? "—"} valueStyle={{ color: "#722ed1", fontSize: 22 }} prefix={<FileTextOutlined />} />
                    </Card>
                  </Col>
                </Row>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
