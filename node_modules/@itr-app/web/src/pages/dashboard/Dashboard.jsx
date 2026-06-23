import React, { useEffect, useState } from "react";
import {
  Row, Col, Card, Statistic, Tag, Typography,
  Table, Button, Alert, Space, Empty, Tooltip,
  theme as antdTheme,
} from "antd";
import {
  FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FileDoneOutlined, ArrowRightOutlined, CalculatorOutlined,
  UploadOutlined, BankOutlined, CalendarOutlined, PlusOutlined,
  SafetyCertificateOutlined, DownloadOutlined, AuditOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useFlagsStore } from "../../store/index.js";
import { FLAGS } from "../../config/features.config.js";
import { getMyFilings } from "../../services/filing.service.js";
import { getPortalFilings, downloadPortalFilingXML } from "../../services/client-portal.service.js";

const { Title, Text } = Typography;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const STATUS_COLOR = {
  draft:     "default",
  submitted: "blue",
  verified:  "green",
  processed: "purple",
};

// Each action's icon keeps a fixed brand/semantic accent color — small icons
// like these read fine on either a light or dark card. The background used
// to be a per-action pastel hex (e.g. "#e6f4ff") that never changed with the
// theme; that's gone now — see how `color` is consumed in the render below.
const QUICK_ACTIONS = [
  {
    key:   "itr1",
    icon:  <FileTextOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
    title: "File ITR-1",
    desc:  "Salaried individuals — FY 2025-26",
    path:  "/filing/itr1",
    flag:  "ITR_1",
  },
  {
    key:   "calculator",
    icon:  <CalculatorOutlined style={{ fontSize: 28, color: "#52c41a" }} />,
    title: "Tax Calculator",
    desc:  "Compare Old vs New regime instantly",
    path:  "/calculator",
    flag:  "REGIME_COMPARISON",
  },
  {
    key:   "advance-tax",
    icon:  <CalendarOutlined style={{ fontSize: 28, color: "#eb2f96" }} />,
    title: "Advance Tax",
    desc:  "Quarterly advance tax computation",
    path:  "/advance-tax",
    flag:  "ADVANCE_TAX_CALC",
  },
  {
    key:   "upload",
    icon:  <UploadOutlined style={{ fontSize: 28, color: "#fa8c16" }} />,
    title: "Upload Form 16",
    desc:  "Auto-parse salary & TDS details",
    path:  "/profile",
    flag:  "FORM_16_PARSER",
  },
  {
    key:   "refund",
    icon:  <BankOutlined style={{ fontSize: 28, color: "#722ed1" }} />,
    title: "Refund Tracker",
    desc:  "Check your ITR refund status",
    path:  "/refund-tracker",
    flag:  "REFUND_TRACKER",
  },
  {
    key:   "efiling",
    icon:  <SafetyCertificateOutlined style={{ fontSize: 28, color: "#13c2c2" }} />,
    title: "e-File with ITD",
    desc:  "Submit your ITR directly to the Income Tax Dept",
    path:  "/efiling",
    flag:  "EFILING_DIRECT",
  },
];

export default function Dashboard() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const { token }  = antdTheme.useToken();
  const liveFlags  = useFlagsStore((s) => s.flags);
  const hasFetched = Object.keys(liveFlags).length > 0;

  const [filings, setFilings]             = useState([]);
  const [filingsLoading, setFilingsLoading] = useState(false);

  const [portalFilings, setPortalFilings]   = useState([]);
  const [portalLoading, setPortalLoading]   = useState(false);
  const [downloadingId, setDownloadingId]   = useState(null);

  useEffect(() => {
    setFilingsLoading(true);
    getMyFilings()
      .then((res) => setFilings(res.data || []))
      .catch(() => {})
      .finally(() => setFilingsLoading(false));
  }, []);

  // CA-onboarded clients (linkedCAClientId set) can additionally see the
  // filings their CA prepared on their behalf, read-only.
  useEffect(() => {
    if (!user?.linkedCAClientId) return;
    setPortalLoading(true);
    getPortalFilings()
      .then((res) => setPortalFilings(res.data || []))
      .catch(() => {})
      .finally(() => setPortalLoading(false));
  }, [user?.linkedCAClientId]);

  const handleDownloadPortalXML = async (filingId) => {
    setDownloadingId(filingId);
    try {
      const blob = await downloadPortalFilingXML(filingId);
      const url  = URL.createObjectURL(new Blob([blob], { type: "application/xml" }));
      const a    = document.createElement("a");
      a.href = url;
      a.download = `ITR1_AY2026-27_${filingId}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // download failures are surfaced via the disabled button state only — non-critical
    } finally {
      setDownloadingId(null);
    }
  };

  const isEnabled = (key) =>
    hasFetched ? (liveFlags[key] ?? false) : (FLAGS[key]?.enabled ?? false);

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

  const portalFilingColumns = [
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
      render:    (s) => <Tag color={STATUS_COLOR[s] || "default"}>{s?.toUpperCase()}</Tag>,
    },
    {
      title:     "Tax",
      key:       "tax",
      render:    (_, r) => (
        <Text strong style={{ color: "#1677ff" }}>
          {r.itr1Data?.taxComputation?.totalTax != null ? fmt(r.itr1Data.taxComputation.totalTax) : "—"}
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
      title:  "Actions",
      key:    "actions",
      render: (_, r) => (
        <Space>
          {r.status !== "draft" && (
            <Tooltip title="Download ITR XML">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={downloadingId === r._id}
                onClick={() => handleDownloadPortalXML(r._id)}
              />
            </Tooltip>
          )}
          {r.status !== "draft" && (
            <Tooltip title="Track Refund Status">
              <Button
                size="small"
                icon={<BankOutlined />}
                onClick={() => navigate(`/refund-tracker?source=portal&id=${r._id}`)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Welcome banner */}
      <Alert
        message={
          <Text>
            Welcome back, <Text strong>{user?.fullName || "Taxpayer"}</Text>!&nbsp;
            Filing for <Text strong>FY 2025-26 (AY 2026-27)</Text> is open.
          </Text>
        }
        type="info"
        showIcon
        icon={<FileDoneOutlined />}
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
        variant="borderless"
        style={{ borderRadius: 10, marginBottom: 24 }}
        extra={<Tag color="blue">AY 2026-27</Tag>}
      >
        <Row gutter={[12, 12]}>
          {QUICK_ACTIONS.filter((a) => isEnabled(a.flag)).map((action) => {
            return (
              <Col xs={24} sm={12} lg={6} key={action.key}>
                <div
                  onClick={() => navigate(action.path)}
                  style={{
                    background:    token.colorFillTertiary,
                    borderRadius:  10,
                    padding:       "20px 16px",
                    cursor:        "pointer",
                    border:        `1px solid ${token.colorBorderSecondary}`,
                    transition:    "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 2px 8px ${token.colorPrimaryBorder}`;
                    e.currentTarget.style.borderColor = token.colorPrimaryBorder;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = token.colorBorderSecondary;
                  }}
                >
                  <div style={{ marginBottom: 10 }}>{action.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{action.title}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{action.desc}</Text>
                </div>
              </Col>
            );
          })}

          {/* Start new filing CTA */}
          <Col xs={24} sm={12} lg={6}>
            <div
              onClick={() => navigate("/filing/itr1")}
              style={{
                background:   token.colorBgContainer,
                borderRadius: 10,
                padding:      "20px 16px",
                cursor:       "pointer",
                border:       `1px dashed ${token.colorBorder}`,
                display:      "flex",
                flexDirection:"column",
                alignItems:   "center",
                justifyContent: "center",
                minHeight:    90,
                transition:   "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = token.colorPrimary;
                e.currentTarget.style.background = token.colorFillTertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = token.colorBorder;
                e.currentTarget.style.background = token.colorBgContainer;
              }}
            >
              <PlusOutlined style={{ fontSize: 24, color: token.colorTextTertiary, marginBottom: 8 }} />
              <Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>
                Start a new filing
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
            variant="borderless"
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
                <span>My Filings</span>
              </Space>
            }
            variant="borderless"
            style={{ borderRadius: 10, height: "100%" }}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => navigate("/filing/itr1")}
              >
                New Filing
              </Button>
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

      {/* Filed by Your CA — only shown for clients onboarded to a CA's Client Portal */}
      {user?.linkedCAClientId && (
        <Card
          title={
            <Space>
              <AuditOutlined />
              <span>Filed by Your CA</span>
            </Space>
          }
          variant="borderless"
          style={{ borderRadius: 10, marginTop: 16 }}
        >
          <Table
            dataSource={portalFilings}
            columns={portalFilingColumns}
            rowKey="_id"
            loading={portalLoading}
            pagination={false}
            size="small"
            scroll={{ x: true }}
            locale={{ emptyText: <Empty description="Your CA hasn't filed anything for you yet." /> }}
          />
        </Card>
      )}
    </div>
  );
}
