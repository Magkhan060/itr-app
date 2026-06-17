import React, { useEffect, useState } from "react";
import {
  Row, Col, Card, Statistic, Table, Tag,
  Typography, Spin, Alert, Avatar, Space,
} from "antd";
import {
  UserOutlined, FileOutlined, TeamOutlined,
} from "@ant-design/icons";
import { getAdminStats } from "../../services/admin.service.js";

const { Text } = Typography;

const initials = (name) =>
  name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

const AVATAR_COLORS = ["#1677ff", "#52c41a", "#fa8c16", "#722ed1", "#eb2f96"];

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
        <Tag color={r === "platform_admin" ? "gold" : "default"} style={{ fontSize: 11 }}>
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
      {/* Stats row — platform-management metrics only, no filing content */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: "Total Users",        value: stats.totalUsers, icon: <TeamOutlined />, color: "#1677ff", bg: "#e6f4ff" },
          { title: "Documents Uploaded", value: stats.totalDocs,  icon: <FileOutlined />, color: "#722ed1", bg: "#f9f0ff" },
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
    </>
  );
}
