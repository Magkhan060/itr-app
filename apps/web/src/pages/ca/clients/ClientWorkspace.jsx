import React, { useEffect, useState } from "react";
import {
  Card, Row, Col, Button, Tag, Typography, Space, Descriptions,
  Table, Alert, Statistic, Divider, Popconfirm, message, Tooltip,
  Badge, Empty, theme as antdTheme,
} from "antd";
import {
  EditOutlined, FileTextOutlined,
  SendOutlined, CheckCircleOutlined, FileDoneOutlined,
  ClockCircleOutlined, WhatsAppOutlined, MailOutlined,
  SafetyCertificateOutlined, UserAddOutlined, UserOutlined,
  IdcardOutlined, PhoneOutlined, ApartmentOutlined, EnvironmentOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../../store/index.js";
import {
  getClient, sendApproval,
  sendClientPortalInvite, getClientPortalInviteStatus,
} from "../../../services/ca.service.js";
import PageHeader from "../../../components/PageHeader.jsx";

const { Text } = Typography;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const APPROVAL_COLOR = { not_sent: "default", pending: "orange", approved: "green", rejected: "red" };
const STATUS_COLOR   = { draft: "default", submitted: "blue", verified: "green", processed: "purple" };

// Same per-client color hashing CADashboard.jsx already uses for its roster
// avatars — reused here so a client's header badge is visually consistent
// with how they appear in the client list.
const AVATAR_COLORS = ["#1677ff", "#52c41a", "#fa8c16", "#722ed1", "#eb2f96", "#13c2c2"];
const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const initials = (name) =>
  name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

export default function ClientWorkspace() {
  const { clientId }  = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuthStore();
  const { token }     = antdTheme.useToken();
  const isAdmin       = user?.role === "ca_admin";
  const canWrite      = user?.role !== "ca_readonly";
  const [client, setClient]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingApproval, setSendingApproval] = useState(false);
  const [portalStatus, setPortalStatus]   = useState(null);
  const [invitingPortal, setInvitingPortal] = useState(false);

  const load = () => {
    setLoading(true);
    getClient(clientId)
      .then((res) => setClient(res.data))
      .catch(() => message.error("Failed to load client"))
      .finally(() => setLoading(false));
  };

  const loadPortalStatus = () => {
    getClientPortalInviteStatus(clientId)
      .then((res) => setPortalStatus(res.data))
      // Not fatal to the page (the Invite button just won't render), but
      // silently swallowing this previously made a real failure here
      // indistinguishable from "this client is already active/pending" —
      // log it so a stuck "—" status is diagnosable instead of mysterious.
      .catch((err) => console.error("Failed to load portal invite status:", err));
  };

  useEffect(load, [clientId]);
  useEffect(loadPortalStatus, [clientId]);

  const handleInvitePortal = async () => {
    setInvitingPortal(true);
    try {
      await sendClientPortalInvite(clientId);
      message.success("Portal invite sent via email and SMS");
      loadPortalStatus();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to send portal invite");
    } finally {
      setInvitingPortal(false);
    }
  };

  const PORTAL_STATUS_TAG = {
    not_invited: { color: "default", label: "Not Invited" },
    pending:     { color: "orange",  label: "Invite Pending" },
    expired:     { color: "red",     label: "Invite Expired" },
    active:      { color: "green",   label: "Active" },
  };

  const latestFiling = client?.filings?.[0] || null;
  const tax          = latestFiling?.itr1Data?.taxComputation || {};

  const handleSendApproval = async () => {
    if (!latestFiling) return;
    setSendingApproval(true);
    try {
      await sendApproval(latestFiling._id);
      message.success("Approval request sent via email and SMS");
      load();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to send approval request");
    } finally {
      setSendingApproval(false);
    }
  };

  // Generate WhatsApp deep-link for the CA to share manually
  const waLink = latestFiling?.approvalToken
    ? `https://wa.me/91${client?.mobile}?text=${encodeURIComponent(
        `Dear ${client?.fullName}, your CA has prepared your ITR-1 for FY 2025-26. ` +
        `Refund/Tax details enclosed. Please review and approve: ` +
        `${window.location.origin}/approve/${latestFiling.approvalToken}`
      )}`
    : null;

  const filingColumns = [
    { title: "Form",   dataIndex: "itrType",       key: "type",   render: (v) => <Tag color="blue">{v}</Tag> },
    { title: "AY",     dataIndex: "assessmentYear", key: "ay",     render: (v) => <Text style={{ fontSize: 12 }}>{v}</Text> },
    { title: "Status", dataIndex: "status",         key: "status", render: (s) => <Tag color={STATUS_COLOR[s]}>{s?.toUpperCase()}</Tag> },
    {
      title:  "Approval",
      key:    "approval",
      render: (_, r) => (
        <Tag color={APPROVAL_COLOR[r.approvalStatus]}>
          {r.approvalStatus === "not_sent"  ? "Not Sent" :
           r.approvalStatus === "pending"   ? "Pending" :
           r.approvalStatus === "approved"  ? "Approved" : "Changes Requested"}
        </Tag>
      ),
    },
    {
      title:  "e-Filing",
      key:    "efiling",
      render: (_, r) => (
        <Tag color={r.efilingStatus === "submitted" ? "green" : "default"}>
          {r.efilingStatus === "submitted" ? "e-Filed" : "Pending"}
        </Tag>
      ),
    },
    { title: "Filed On", dataIndex: "submittedAt", key: "date", render: (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—" },
  ];

  if (loading) return <Card loading style={{ borderRadius: 10 }} />;

  // Filing action button — its own variable so it's defined once and reused
  // both inside the Client Details card's extra and nowhere else, instead
  // of being scattered into a page-header action group disconnected from
  // the client it actually applies to.
  const filingActionButton =
    canWrite && (!latestFiling || latestFiling.status === "draft") ? (
      <Button
        type="primary"
        icon={<FileTextOutlined />}
        onClick={() => navigate(`/ca/clients/${clientId}/itr1`)}
      >
        {latestFiling?.status === "draft" ? "Continue Filing" : "Start ITR-1"}
      </Button>
    ) : canWrite && latestFiling?.status === "submitted" ? (
      <Button
        icon={<FileTextOutlined />}
        onClick={() => navigate(`/ca/clients/${clientId}/itr1`)}
      >
        Edit Filing
      </Button>
    ) : null;

  return (
    <div>
      <PageHeader
        onBack={() => navigate("/dashboard")}
        backAlign="right"
        icon={<span style={{ fontWeight: 700, fontSize: 16 }}>{initials(client?.fullName)}</span>}
        color={avatarColor(client?.fullName)}
        title={client?.fullName}
        subtitle={
          <Space size={8} wrap>
            <Text type="secondary" copyable={{ text: client?.pan }} style={{ fontSize: 13 }}>
              {client?.pan}
            </Text>
            <Tag color={PORTAL_STATUS_TAG[portalStatus?.status]?.color || "default"} style={{ fontSize: 11 }}>
              Portal: {PORTAL_STATUS_TAG[portalStatus?.status]?.label || "—"}
            </Tag>
          </Space>
        }
      />

      {/* ── Client Details — full-width, action buttons live here (attached
          to the entity they act on) instead of floating in the page header ── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 10, marginBottom: 16 }}
        title={
          <Space>
            <UserOutlined />
            <span>Client Details</span>
          </Space>
        }
        extra={
          <Space wrap>
            {canWrite && (
              <Button icon={<EditOutlined />} onClick={() => navigate(`/ca/clients/${clientId}/edit`)}>
                Edit Client
              </Button>
            )}
            {filingActionButton}
          </Space>
        }
      >
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small" bordered>
          <Descriptions.Item label={<Space size={4}><PhoneOutlined />Mobile</Space>}>
            {client?.mobile ? <Text copyable={{ text: client.mobile }}>+91 {client.mobile}</Text> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={<Space size={4}><MailOutlined />Email</Space>}>
            {client?.email ? <Text copyable={{ text: client.email }}>{client.email}</Text> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={<Space size={4}><ApartmentOutlined />Employer</Space>}>
            {client?.employerName || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={<Space size={4}><EnvironmentOutlined />City</Space>}>
            {client?.city || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={<Space size={4}><IdcardOutlined />PAN</Space>}>
            <Text code copyable={{ text: client?.pan }}>{client?.pan}</Text>
          </Descriptions.Item>
        </Descriptions>

        {client?.notes && (
          <div
            style={{
              marginTop: 16, padding: "10px 14px", borderRadius: 8,
              background: token.colorFillTertiary,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}
          >
            <InfoCircleOutlined style={{ color: token.colorTextSecondary, marginTop: 2 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>{client.notes}</Text>
          </div>
        )}

        {/* Always show what's going on with the portal invite — the button
            only applies to two of the four statuses, but the OTHER two
            (pending/active) used to render nothing at all here, which read
            as "broken" rather than "intentionally not actionable". */}
        {portalStatus && (
          <>
            <Divider style={{ margin: "16px 0" }} />
            <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {portalStatus.status === "active"
                  ? "This client has an active self-service portal account."
                  : portalStatus.status === "pending"
                    ? `Invite sent ${portalStatus.sentAt ? new Date(portalStatus.sentAt).toLocaleDateString("en-IN") : ""} — awaiting the client to sign up.`
                    : portalStatus.status === "expired"
                      ? "Their portal invite expired before they signed up."
                      : "This client hasn't been invited to the self-service portal yet."}
              </Text>
              {canWrite && (portalStatus.status === "not_invited" || portalStatus.status === "expired") && (
                <Tooltip title="Invite this client to view their filings, download XML, and track refund status online">
                  <Button
                    size="small"
                    icon={<UserAddOutlined />}
                    loading={invitingPortal}
                    onClick={handleInvitePortal}
                  >
                    {portalStatus.status === "expired" ? "Resend Invite" : "Invite to Portal"}
                  </Button>
                </Tooltip>
              )}
            </Space>
          </>
        )}
      </Card>

      {/* ── Latest filing + approval actions ──────────────────────────── */}
      {latestFiling && latestFiling.status !== "draft" ? (
        <Card
          variant="borderless"
          style={{ borderRadius: 10, marginBottom: 16 }}
          title={
            <Space>
              <FileDoneOutlined />
              <span>Latest Filing Summary</span>
              <Tag color="blue">AY {latestFiling.assessmentYear}</Tag>
            </Space>
          }
          extra={
            <Tag color={APPROVAL_COLOR[latestFiling.approvalStatus]}>
              {latestFiling.approvalStatus?.replace("_", " ").toUpperCase()}
            </Tag>
          }
        >
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {[
              { label: "Gross Salary",  value: latestFiling.itr1Data?.grossSalary, color: "#1677ff" },
              { label: "Total Tax",     value: tax.totalTax,    color: "#fa541c"  },
              { label: "TDS Deducted",  value: latestFiling.itr1Data?.tdsDeducted, color: "#52c41a" },
              {
                label: (latestFiling.itr1Data?.tdsDeducted || 0) >= (tax.totalTax || 0) ? "Refund Due" : "Tax Payable",
                value: Math.abs((latestFiling.itr1Data?.tdsDeducted || 0) - (tax.totalTax || 0)),
                color: "#722ed1",
              },
            ].map(({ label, value, color }) => (
              <Col xs={12} sm={6} key={label}>
                <Card variant="borderless" style={{ borderRadius: 8, textAlign: "center", background: token.colorFillTertiary }}>
                  <Statistic title={<Text style={{ fontSize: 10 }}>{label}</Text>} value={fmt(value)} valueStyle={{ color, fontSize: 14, fontWeight: 600 }} />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Approval actions — sending for approval finalizes the filing, so it's CA Admin only */}
          {latestFiling.approvalStatus === "not_sent" && (
            <Alert
              type="info"
              showIcon
              message="Ready to send for client approval"
              description={isAdmin
                ? "The ITR has been prepared. Send it to the client for review and approval before e-filing."
                : "The ITR has been prepared. Ask your CA Admin to review and send it for client approval."}
              style={{ marginBottom: 16, borderRadius: 8 }}
              action={
                isAdmin && (
                  <Space direction="vertical">
                    <Button
                      type="primary"
                      size="small"
                      icon={<SendOutlined />}
                      loading={sendingApproval}
                      onClick={handleSendApproval}
                    >
                      Send via Email + SMS
                    </Button>
                  </Space>
                )
              }
            />
          )}

          {latestFiling.approvalStatus === "pending" && (
            <Alert
              type="warning"
              showIcon
              icon={<ClockCircleOutlined />}
              message="Waiting for client approval"
              description={`Approval request sent on ${latestFiling.approvalSentAt ? new Date(latestFiling.approvalSentAt).toLocaleDateString("en-IN") : "—"}`}
              style={{ marginBottom: 16, borderRadius: 8 }}
              action={
                waLink && (
                  <Tooltip title="Open WhatsApp to send reminder">
                    <Button size="small" icon={<WhatsAppOutlined />} href={waLink} target="_blank" style={{ color: "#25D366", borderColor: "#25D366" }}>
                      WhatsApp Reminder
                    </Button>
                  </Tooltip>
                )
              }
            />
          )}

          {latestFiling.approvalStatus === "approved" && latestFiling.efilingStatus !== "submitted" && (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="Client has approved — ready to e-file"
              description={`Approved on ${latestFiling.approvalRespondedAt ? new Date(latestFiling.approvalRespondedAt).toLocaleDateString("en-IN") : "—"}${!isAdmin ? " — ask your CA Admin to e-file." : ""}`}
              style={{ marginBottom: 16, borderRadius: 8 }}
              action={
                isAdmin && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<SafetyCertificateOutlined />}
                    onClick={() => navigate(`/efiling?filingId=${latestFiling._id}`)}
                  >
                    Proceed to e-File
                  </Button>
                )
              }
            />
          )}

          {latestFiling.efilingStatus === "submitted" && (
            <Alert
              type="success"
              showIcon
              icon={<FileDoneOutlined />}
              message="Return successfully e-filed with ITD"
              description={`ITR-V Acknowledgement: ${latestFiling.itrVAckNo || "—"} · Filed on ${latestFiling.efiledAt ? new Date(latestFiling.efiledAt).toLocaleDateString("en-IN") : "—"}`}
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          {latestFiling.approvalStatus === "rejected" && (
            <Alert
              type="error"
              showIcon
              message="Client requested changes"
              description={latestFiling.approvalComment ? `Comment: "${latestFiling.approvalComment}"` : "No comment provided."}
              style={{ marginBottom: 16, borderRadius: 8 }}
              action={
                canWrite && (
                  <Button size="small" onClick={() => navigate(`/ca/clients/${clientId}/itr1`)}>
                    Revise Filing
                  </Button>
                )
              }
            />
          )}
        </Card>
      ) : (
        <Alert
          type="info"
          showIcon
          message={latestFiling?.status === "draft" ? "Draft in progress" : "No filing prepared yet"}
          description={latestFiling?.status === "draft"
            ? "Continue filling the ITR form and submit to proceed."
            : "Start an ITR-1 filing for this client."}
          style={{ marginBottom: 16, borderRadius: 8 }}
          action={
            canWrite && (
              <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate(`/ca/clients/${clientId}/itr1`)}>
                {latestFiling?.status === "draft" ? "Continue Filing" : "Start ITR-1"}
              </Button>
            )
          }
        />
      )}

      {/* ── Filing history ─────────────────────────────────────────────── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 10 }}
        title={
          <Space>
            <FileTextOutlined />
            <span>Filing History</span>
            <Badge count={client?.filings?.length || 0} showZero style={{ backgroundColor: token.colorPrimary }} />
          </Space>
        }
      >
        <Table
          dataSource={client?.filings || []}
          columns={filingColumns}
          rowKey="_id"
          pagination={false}
          size="small"
          locale={{ emptyText: <Empty description="No filings yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
    </div>
  );
}
