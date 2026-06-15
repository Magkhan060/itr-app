import React, { useEffect, useState } from "react";
import {
  Row, Col, Card, Table, Tag, Typography, Button,
  Space, Statistic, Badge, Empty, Avatar, Input,
} from "antd";
import {
  TeamOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileDoneOutlined, PlusOutlined,
  SearchOutlined, AuditOutlined, ArrowRightOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import { listClients } from "../../services/ca.service.js";

const { Title, Text } = Typography;

const APPROVAL_COLOR = {
  not_sent: "default",
  pending:  "orange",
  approved: "green",
  rejected: "red",
};

const STATUS_COLOR = {
  draft:     "default",
  submitted: "blue",
  verified:  "green",
  processed: "purple",
};

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export default function CADashboard() {
  const { user }    = useAuthStore();
  const navigate    = useNavigate();
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    setLoading(true);
    listClients()
      .then((res) => setClients(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.pan.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // Pipeline stats
  const total     = clients.length;
  const drafts    = clients.filter((c) => c.latestFiling?.status === "draft").length;
  const pending   = clients.filter((c) => c.latestFiling?.approvalStatus === "pending").length;
  const approved  = clients.filter((c) => c.latestFiling?.approvalStatus === "approved").length;
  const filed     = clients.filter((c) => c.latestFiling?.efilingStatus === "submitted").length;
  const noFiling  = clients.filter((c) => !c.latestFiling).length;

  const columns = [
    {
      title:  "Client",
      key:    "client",
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: "#1677ff", fontSize: 13 }}>
            {r.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.fullName}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.pan}</Text>
          </div>
        </Space>
      ),
    },
    {
      title:  "Contact",
      key:    "contact",
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 12 }}>{r.email || "—"}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.mobile ? `+91 ${r.mobile}` : ""}</Text>
        </div>
      ),
    },
    {
      title:  "Filing Status",
      key:    "status",
      render: (_, r) => {
        if (!r.latestFiling) return <Tag>No Filing</Tag>;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={STATUS_COLOR[r.latestFiling.status]}>
              {r.latestFiling.status?.toUpperCase()}
            </Tag>
            {r.latestFiling.approvalStatus && r.latestFiling.approvalStatus !== "not_sent" && (
              <Tag color={APPROVAL_COLOR[r.latestFiling.approvalStatus]} style={{ fontSize: 10 }}>
                {r.latestFiling.approvalStatus === "pending"  ? "⏳ Awaiting Approval" :
                 r.latestFiling.approvalStatus === "approved" ? "✓ Client Approved" :
                 "✗ Changes Requested"}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title:  "Actions",
      key:    "actions",
      render: (_, r) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate(`/ca/clients/${r._id}`)}
        >
          Open Workspace
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AuditOutlined style={{ fontSize: 28, color: "#722ed1" }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>CA Dashboard</Title>
            <Text type="secondary">{user?.caFirmName || "Tax Practice"} · FY 2025-26</Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate("/ca/clients/new")}
        >
          Add Client
        </Button>
      </div>

      {/* Pipeline stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {[
          { label: "Total Clients",    value: total,    icon: <TeamOutlined />,         color: "#1677ff" },
          { label: "Pending Approval", value: pending,  icon: <ClockCircleOutlined />,  color: "#faad14" },
          { label: "Client Approved",  value: approved, icon: <CheckCircleOutlined />,  color: "#52c41a" },
          { label: "e-Filed",          value: filed,    icon: <FileDoneOutlined />,      color: "#722ed1" },
          { label: "No Filing Yet",    value: noFiling, icon: <FileTextOutlined />,      color: "#8c8c8c" },
        ].map(({ label, value, icon, color }) => (
          <Col xs={12} sm={8} lg={4} key={label}>
            <Card variant="borderless" style={{ borderRadius: 10, border: "1px solid #f0f0f0" }}>
              <Statistic
                title={<Text style={{ fontSize: 11 }}>{label}</Text>}
                value={value}
                prefix={React.cloneElement(icon, { style: { color, fontSize: 16 } })}
                valueStyle={{ color, fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Client table */}
      <Card
        variant="borderless"
        style={{ borderRadius: 10 }}
        title={
          <Space>
            <TeamOutlined />
            <span>Client Roster</span>
            <Badge count={total} showZero style={{ backgroundColor: "#1677ff" }} />
          </Space>
        }
        extra={
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name, PAN, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
        }
      >
        {clients.length === 0 && !loading ? (
          <Empty
            description="No clients yet. Add your first client to get started."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/ca/clients/new")}>
              Add First Client
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            size="middle"
            onRow={(r) => ({ onClick: () => navigate(`/ca/clients/${r._id}`), style: { cursor: "pointer" } })}
          />
        )}
      </Card>
    </div>
  );
}
