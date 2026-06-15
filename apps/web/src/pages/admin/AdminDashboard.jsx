import React, { useEffect, useState } from "react";
import {
  Row, Col, Card, Statistic, Table, Tag,
  Typography, Spin, Alert, Avatar, Progress, Space,
} from "antd";
import {
  UserOutlined, FileTextOutlined, CheckCircleOutlined,
  FileOutlined, TeamOutlined, RiseOutlined,
} from "@ant-design/icons";
import { getAdminStats } from "../../services/admin.service.js";

const { Text } = Typography;

const initials = (name) =>
  name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

const AVATAR_COLORS = ["#1677ff", "#52c41a", "#fa8c16", "#722ed1", "#eb2f96"];

const STATUS_COLORS = {
  draft:     { bar: "#faad14", tag: "default"  },
  submitted: { bar: "#1677ff", tag: "blue"     },
  verified:  { bar: "#52c41a", tag: "success"  },
  processed: { bar: "#722ed1", tag: "purple"   },
};

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getAdminStats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", paddingTop: 80 }}><Spin size="large" /></div>;
  if (error)   return <Alert type="error" message={error} showIcon />;

  const totalFilings = stats.totalFilings || 1; // avoid div/0

  const userColumns = [
    {
      title: "User",
      key:   "user",
      render: (_, r, idx) => (
        <Space>
          <Avatar
            size={36}
            style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length], fontSize: 13 }}
          >
            {initials(r.fullName)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.fullName}</div>
            <div style={{ color: "#8c8c8c", fontSize: 11 }}>{r.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title:     "PAN",
      dataIndex: "pan",
      key:       "pan",
      render:    (p) => <Tag color="blue" style={{ fontSize: 11 }}>{p}</Tag>,
    },
    {
      title:  "Role",
      dataIndex: "role",
      key:    "role",
      render: (r) => (
        <Tag color={r === "admin" ? "gold" : "default"} style={{ fontSize: 11 }}>
          {r?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title:     "Joined",
      dataIndex: "createdAt",
      key:       "joined",
      render:    (d) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(d).toLocaleDateString("en-IN")}</Text>,
    },
  ];

  return (
    <>
      {/* Stats row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: "Total Users",        value: stats.totalUsers,       icon: <TeamOutlined />,        color: "#1677ff", bg: "#e6f4ff" },
          { title: "Total Filings",      value: stats.totalFilings,     icon: <FileTextOutlined />,    color: "#52c41a", bg: "#f6ffed" },
          { title: "Submitted Filings",  value: stats.submittedFilings, icon: <CheckCircleOutlined />, color: "#fa8c16", bg: "#fff7e6" },
          { title: "Documents Uploaded", value: stats.totalDocs,        icon: <FileOutlined />,        color: "#722ed1", bg: "#f9f0ff" },
        ].map(({ title, value, icon, color, bg }) => (
          <Col xs={12} lg={6} key={title}>
            <Card bordered={false} style={{ borderRadius: 10 }} hoverable>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: bg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 22, color, flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>}
                  value={value}
                  valueStyle={{ color, fontSize: 24 }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Recent registrations */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Recent Registrations</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 10 }}
            extra={<Tag color="blue">{stats.recentUsers.length} shown</Tag>}
          >
            <Table
              dataSource={stats.recentUsers}
              columns={userColumns}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Right column: two breakdown cards */}
        <Col xs={24} lg={10}>
          {/* Filings by status */}
          <Card
            title="Filings by Status"
            bordered={false}
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            {stats.filingsByStatus.length === 0 ? (
              <Text type="secondary">No filings yet</Text>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {stats.filingsByStatus.map(({ _id, count }) => {
                  const pct  = Math.round((count / totalFilings) * 100);
                  const meta = STATUS_COLORS[_id] || { bar: "#d9d9d9", tag: "default" };
                  return (
                    <div key={_id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <Tag color={meta.tag}>{_id?.toUpperCase()}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{count} filing{count !== 1 ? "s" : ""}</Text>
                      </div>
                      <Progress
                        percent={pct}
                        strokeColor={meta.bar}
                        showInfo={false}
                        size="small"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Filings by ITR type */}
          <Card
            title="Filings by Form"
            bordered={false}
            style={{ borderRadius: 10 }}
          >
            {stats.filingsByType.length === 0 ? (
              <Text type="secondary">No filings yet</Text>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stats.filingsByType.map(({ _id, count }) => {
                  const pct = Math.round((count / totalFilings) * 100);
                  return (
                    <div key={_id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <Tag color="blue">{_id}</Tag>
                        <Text strong style={{ fontSize: 12 }}>{count}</Text>
                      </div>
                      <Progress percent={pct} strokeColor="#1677ff" showInfo={false} size="small" />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
