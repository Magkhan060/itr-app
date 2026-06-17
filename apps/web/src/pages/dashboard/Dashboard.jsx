import React, { useEffect, useState } from "react";
import {
  Row, Col, Card, Statistic, Tag, Typography,
  Table, Button, Alert, Space, Empty, Tooltip,
} from "antd";
import {
  FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FileDoneOutlined, ArrowRightOutlined, CalculatorOutlined,
  UploadOutlined, BankOutlined, CalendarOutlined, PlusOutlined,
  SafetyCertificateOutlined, AuditOutlined, TeamOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useFlagsStore } from "../../store/index.js";
import { FLAGS } from "../../config/features.config.js";
import { getMyFilings } from "../../services/filing.service.js";

const { Title, Text } = Typography;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const STATUS_COLOR = {
  draft:     "default",
  submitted: "blue",
  verified:  "green",
  processed: "purple",
};

// Base quick actions — role-specific overrides are applied inside the component.
const QUICK_ACTIONS = [
  {
    key:   "itr1",
    icon:  <FileTextOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
    title: "File ITR-1",
    desc:  "Salaried individuals — FY 2025-26",
    path:  "/filing/itr1",
    flag:  "ITR_1",
    color: "#e6f4ff",
  },
  {
    key:   "calculator",
    icon:  <CalculatorOutlined style={{ fontSize: 28, color: "#52c41a" }} />,
    title: "Tax Calculator",
    desc:  "Compare Old vs New regime instantly",
    path:  "/calculator",
    flag:  "REGIME_COMPARISON",
    color: "#f6ffed",
  },
  {
    key:   "upload",
    icon:  <UploadOutlined style={{ fontSize: 28, color: "#fa8c16" }} />,
    title: "Upload Form 16",
    desc:  "Auto-parse salary & TDS details",
    path:  "/profile",
    flag:  "FORM_16_PARSER",
    color: "#fff7e6",
  },
  {
    key:   "refund",
    icon:  <BankOutlined style={{ fontSize: 28, color: "#722ed1" }} />,
    title: "Refund Tracker",
    desc:  "Check your ITR refund status",
    path:  "/refund-tracker",
    flag:  "REFUND_TRACKER",
    color: "#f9f0ff",
  },
  {
    key:   "efiling",
    icon:  <SafetyCertificateOutlined style={{ fontSize: 28, color: "#13c2c2" }} />,
    title: "e-File with ITD",
    desc:  "Submit your ITR directly to the Income Tax Dept",
    path:  "/efiling",
    flag:  "EFILING_DIRECT",
    color: "#e6fffb",
    // CA override applied at render time — see resolveAction(). In practice this
    // branch is unreachable now since /dashboard role-dispatches to CADashboard
    // for CA roles before Dashboard.jsx ever mounts for them — kept only for the
    // platform_admin "File ITR" tab case, where isCA is always false anyway.
    caPath:  "/dashboard",
    caDesc:  "Manage pending client e-filings from your dashboard",
  },
];

export default function Dashboard() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const liveFlags  = useFlagsStore((s) => s.flags);
  const hasFetched = Object.keys(liveFlags).length > 0;
  const isCA       = ["ca_admin", "ca_staff", "ca_readonly"].includes(user?.role);

  const [filings, setFilings]             = useState([]);
  const [filingsLoading, setFilingsLoading] = useState(false);

  useEffect(() => {
    setFilingsLoading(true);
    getMyFilings()
      .then((res) => setFilings(res.data || []))
      .catch(() => {})
      .finally(() => setFilingsLoading(false));
  }, []);

  const isEnabled = (key) =>
    hasFetched ? (liveFlags[key] ?? false) : (FLAGS[key]?.enabled ?? false);

  // Resolve role-aware path and description for a quick action.
  const resolveAction = (action) => ({
    ...action,
    path: isCA && action.caPath ? action.caPath : action.path,
    desc: isCA && action.caDesc ? action.caDesc : action.desc,
  });

  // Stats derived from real filings
  const draftCount     = filings.filter((f) => f.status === "draft").length;
  const submittedCount = filings.filter((f) => f.status !== "draft").length;
  const latestFiling   = filings[0] || null;

  // Enabled ITR forms from live flags
  const enabledForms = Object.entries(FLAGS)
    .filter(([key]) => key.startsWith("ITR_"))
    .filter(([key, config]) => hasFetched ? (liveFlags[key] ?? config.enabled) : config.enabled)
    .map(([key, config]) => ({ key, ...config }));

  const itrColumns = [
    {
      title:  "Form",
      key:    "form",
      render: (_, r) => (
        <Space>
          <FileTextOutlined style={{ color: "#1677ff" }} />
          <Text strong>{r.label}</Text>
        </Space>
      ),
    },
    {
      title:  "Who should file",
      key:    "desc",
      render: (_, r) => {
        const descriptions = {
          ITR_1: "Salaried · Income ≤ ₹50L",
          ITR_2: "Capital gains · No business income",
          ITR_3: "Business / Profession income",
          ITR_4: "Presumptive taxation",
          ITR_5: "Firms, LLPs, AOPs",
          ITR_6: "Companies (non-80G)",
          ITR_7: "Trusts, NGOs, Political parties",
        };
        return <Text type="secondary" style={{ fontSize: 12 }}>{descriptions[r.key] || "—"}</Text>;
      },
    },
    {
      title:  "Action",
      key:    "action",
      render: (_, r) => {
        const paths = {
          ITR_1: "/filing/itr1",
          ITR_2: "/filing/itr2",
          ITR_3: "/filing/itr3",
          ITR_4: "/filing/itr4",
        };
        const path = paths[r.key];
        return (
          <Button
            type="primary"
            ghost
            size="small"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate(path || "/dashboard")}
            disabled={!path}
          >
            {path ? "Start Filing" : "Coming Soon"}
          </Button>
        );
      },
    },
  ];

  const filingColumns = [
    {
      title:     "Form",
      dataIndex: "itrType",
      key:       "itrType",
      render:    (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title:     "AY",
      dataIndex: "assessmentYear",
      key:       "ay",
      render:    (v) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title:     "Status",
      dataIndex: "status",
      key:       "status",
      render:    (s) => (
        <Tag color={STATUS_COLOR[s] || "default"}>{s?.toUpperCase()}</Tag>
      ),
    },
    {
      title:     "Tax",
      key:       "tax",
      render:    (_, r) => (
        <Text strong style={{ color: "#1677ff" }}>
          {r.taxSummary?.totalTax != null ? fmt(r.taxSummary.totalTax) : "—"}
        </Text>
      ),
    },
    {
      title:     "Acknowledgement",
      dataIndex: "acknowledgementNo",
      key:       "ack",
      render:    (v) => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title:     "Filed On",
      dataIndex: "submittedAt",
      key:       "date",
      render:    (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—",
    },
  ];

  return (
    <div>
      {/* Welcome banner */}
      <Alert
        message={
          <Text>
            Welcome back, <Text strong>{user?.fullName || (isCA ? "Tax Professional" : "Taxpayer")}</Text>!&nbsp;
            {isCA
              ? <>You are signed in as a <Text strong>Chartered Accountant</Text>. Use the CA Dashboard to manage client filings.</>
              : <>Filing for <Text strong>FY 2025-26 (AY 2026-27)</Text> is open.</>
            }
          </Text>
        }
        type="info"
        showIcon
        icon={isCA ? <AuditOutlined /> : <FileDoneOutlined />}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      {/* Stats row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          {
            title:       "Available Forms",
            value:       enabledForms.length,
            icon:        <FileTextOutlined />,
            color:       "#1677ff",
            suffix:      "of 7",
          },
          {
            title:       "Filings Submitted",
            value:       submittedCount,
            icon:        <CheckCircleOutlined />,
            color:       "#52c41a",
          },
          {
            title:       "Drafts in Progress",
            value:       draftCount,
            icon:        <ClockCircleOutlined />,
            color:       "#faad14",
          },
          {
            title:       "Latest Filing",
            value:       latestFiling ? latestFiling.itrType : "—",
            icon:        <FileDoneOutlined />,
            color:       "#722ed1",
            valueStyle:  { fontSize: 22 },
            suffix:      latestFiling
              ? <Tag color={STATUS_COLOR[latestFiling.status]} style={{ marginLeft: 6 }}>{latestFiling.status}</Tag>
              : null,
          },
        ].map(({ title, value, icon, color, suffix, valueStyle }) => (
          <Col xs={24} sm={12} lg={6} key={title}>
            <Card variant="borderless" style={{ borderRadius: 10 }} hoverable>
              <Statistic
                title={title}
                value={value}
                suffix={suffix}
                prefix={React.cloneElement(icon, { style: { color } })}
                valueStyle={{ color, ...(valueStyle || {}) }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Actions */}
      <Card
        title="Quick Actions"
        bordered={false}
        style={{ borderRadius: 10, marginBottom: 24 }}
        extra={<Tag color="blue">AY 2026-27</Tag>}
      >
        <Row gutter={[12, 12]}>
          {QUICK_ACTIONS.filter((a) => isEnabled(a.flag)).map((raw) => {
            const action = resolveAction(raw);
            return (
              <Col xs={24} sm={12} lg={6} key={action.key}>
                <div
                  onClick={() => navigate(action.path)}
                  style={{
                    background:    action.color,
                    borderRadius:  10,
                    padding:       "20px 16px",
                    cursor:        "pointer",
                    border:        "1px solid transparent",
                    transition:    "all 0.2s",
                  }}
                  className="hover:shadow-md hover:border-blue-100"
                >
                  <div style={{ marginBottom: 10 }}>{action.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{action.title}</div>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>{action.desc}</div>
                </div>
              </Col>
            );
          })}

          {/* CTA tile — role-aware */}
          <Col xs={24} sm={12} lg={6}>
            <div
              onClick={() => navigate(isCA ? "/dashboard" : "/filing/itr1")}
              style={{
                background:   "#fff",
                borderRadius: 10,
                padding:      "20px 16px",
                cursor:       "pointer",
                border:       "1px dashed #d9d9d9",
                display:      "flex",
                flexDirection:"column",
                alignItems:   "center",
                justifyContent: "center",
                minHeight:    90,
                transition:   "all 0.2s",
              }}
              className="hover:border-blue-400 hover:bg-blue-50"
            >
              {isCA
                ? <TeamOutlined style={{ fontSize: 24, color: "#722ed1", marginBottom: 8 }} />
                : <PlusOutlined style={{ fontSize: 24, color: "#bfbfbf", marginBottom: 8 }} />
              }
              <Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>
                {isCA ? "Go to CA Dashboard" : "Start a new filing"}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Available ITR forms */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>Available ITR Forms</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 10 }}
            extra={<Tag color="green">{enabledForms.length} Active</Tag>}
          >
            {enabledForms.length > 0 ? (
              <Table
                dataSource={enabledForms}
                columns={itrColumns}
                rowKey="key"
                pagination={false}
                size="middle"
              />
            ) : (
              <Empty description="No ITR forms enabled. Contact your admin." />
            )}
          </Card>
        </Col>

        {/* My Filings summary */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <FileDoneOutlined />
                <span>{isCA ? "Client Filings" : "My Filings"}</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 10, height: "100%" }}
            extra={
              isCA ? (
                <Button
                  size="small"
                  icon={<TeamOutlined />}
                  onClick={() => navigate("/dashboard")}
                >
                  CA Dashboard
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/filing/itr1")}
                >
                  New Filing
                </Button>
              )
            }
          >
            <Table
              dataSource={filings}
              columns={filingColumns}
              rowKey="_id"
              loading={filingsLoading}
              pagination={false}
              size="small"
              scroll={{ x: true }}
              locale={{ emptyText: <Empty description="No filings yet. Start with ITR-1 above." /> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
