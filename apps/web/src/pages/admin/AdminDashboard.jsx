import React, { useEffect, useState } from "react";
import {
  Row, Col, Card, Statistic, Table, Tag,
  Typography, Spin, Alert,
} from "antd";
import {
  UserOutlined, FileTextOutlined,
  CheckCircleOutlined, FileOutlined,
} from "@ant-design/icons";
import { getAdminStats } from "../../services/admin.service.js";

const { Text } = Typography;

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    getAdminStats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10"><Spin size="large" /></div>;
  if (error)   return <Alert type="error" message={error} showIcon />;

  const userColumns = [
    { title: "Name",  dataIndex: "fullName", key: "name",
      render: (n) => <Text strong>{n}</Text> },
    { title: "PAN",   dataIndex: "pan",      key: "pan",
      render: (p) => <Tag color="blue">{p}</Tag> },
    { title: "Email", dataIndex: "email",    key: "email" },
    { title: "Role",  dataIndex: "role",     key: "role",
      render: (r) => <Tag color={r === "admin" ? "gold" : "default"}>{r?.toUpperCase()}</Tag> },
    { title: "Joined", dataIndex: "createdAt", key: "joined",
      render: (d) => new Date(d).toLocaleDateString("en-IN") },
  ];

  return (
    <>
      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: "Total Users",       value: stats.totalUsers,      icon: <UserOutlined />,         color: "#1677ff" },
          { title: "Total Filings",     value: stats.totalFilings,    icon: <FileTextOutlined />,     color: "#52c41a" },
          { title: "Submitted Filings", value: stats.submittedFilings,icon: <CheckCircleOutlined />,  color: "#faad14" },
          { title: "Documents Uploaded",value: stats.totalDocs,       icon: <FileOutlined />,         color: "#722ed1" },
        ].map(({ title, value, icon, color }) => (
          <Col xs={12} lg={6} key={title}>
            <Card bordered={false} style={{ borderRadius: 10 }}>
              <Statistic
                title={title}
                value={value}
                prefix={React.cloneElement(icon, { style: { color } })}
                valueStyle={{ color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Recent users */}
        <Col xs={24} lg={14}>
          <Card title="Recent Registrations" bordered={false} style={{ borderRadius: 10 }}>
            <Table
              dataSource={stats.recentUsers}
              columns={userColumns}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Filing breakdown */}
        <Col xs={24} lg={10}>
          <Card title="Filings by Type" bordered={false}
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            {stats.filingsByType.map(({ _id, count }) => (
              <div key={_id} className="flex justify-between py-2"
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                <Tag color="blue">{_id}</Tag>
                <Text strong>{count}</Text>
              </div>
            ))}
            {stats.filingsByType.length === 0 && (
              <Text type="secondary">No filings yet</Text>
            )}
          </Card>

          <Card title="Filings by Status" bordered={false} style={{ borderRadius: 10 }}>
            {stats.filingsByStatus.map(({ _id, count }) => (
              <div key={_id} className="flex justify-between py-2"
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                <Tag color={_id === "submitted" ? "blue" : _id === "draft" ? "default" : "green"}>
                  {_id?.toUpperCase()}
                </Tag>
                <Text strong>{count}</Text>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </>
  );
}
