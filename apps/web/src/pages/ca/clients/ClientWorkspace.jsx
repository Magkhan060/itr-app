import React, { useEffect, useState } from "react";
import {
  Card, Row, Col, Button, Tag, Typography, Space, Descriptions,
  Table, Alert, Statistic, Divider, Popconfirm, message, Tooltip,
  Badge, Empty, Dropdown, theme as antdTheme,
} from "antd";
import {
  FileTextOutlined,
  SendOutlined, CheckCircleOutlined, FileDoneOutlined,
  ClockCircleOutlined, WhatsAppOutlined,
  SafetyCertificateOutlined, UserAddOutlined, UserOutlined,
  ApartmentOutlined, EnvironmentOutlined,
  InfoCircleOutlined, DownOutlined, BankOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../../store/index.js";
import {
  getClient, sendApproval,
  sendClientPortalInvite, getClientPortalInviteStatus,
  getClientFilingRefund,
} from "../../../services/ca.service.js";
import useFeature from "../../../hooks/useFeature.js";
import PageHeader from "../../../components/PageHeader.jsx";
import RefundStatusModal from "./RefundStatusModal.jsx";

const { Text } = Typography;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const APPROVAL_COLOR = { not_sent: "default", pending: "orange", approved: "green", rejected: "red" };
const STATUS_COLOR   = { draft: "default", submitted: "blue", verified: "green", processed: "purple" };
const ITR_TYPE_LABEL = { "ITR-1": "ITR-1 (Salaried)", "ITR-2": "ITR-2 (Capital Gains)" };

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
  const [sendingApprovalId, setSendingApprovalId] = useState(null);
  const [portalStatus, setPortalStatus]   = useState(null);
  const [invitingPortal, setInvitingPortal] = useState(false);
  const [refundModal, setRefundModal] = useState({ open: false, loading: false, status: null, filing: null });

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

  const itr1Enabled = useFeature("ITR_1");
  const itr2Enabled = useFeature("ITR_2");

  const filings         = client?.filings || [];
  const nonDraftFilings = filings.filter((f) => f.status !== "draft");
  const draftFilings    = filings.filter((f) => f.status === "draft");

  const existingTypes = new Set(filings.map((f) => f.itrType));
  const missingType = ["ITR-1", "ITR-2"].find(
    (t) => !existingTypes.has(t) && (t === "ITR-1" ? itr1Enabled : itr2Enabled)
  );

  const filingPathFor = (filing) => (filing?.itrType === "ITR-2" ? "itr2" : "itr1");
  const filingDataFor = (filing) => (filing?.itrType === "ITR-2" ? filing?.itr2Data : filing?.itr1Data);

  const handleSendApproval = async (filing) => {
    setSendingApprovalId(filing._id);
    try {
      await sendApproval(filing._id);
      message.success("Approval request sent via email and SMS");
      load();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to send approval request");
    } finally {
      setSendingApprovalId(null);
    }
  };

  const handleTrackRefund = async (filing) => {
    setRefundModal({ open: true, loading: true, status: null, filing });
    try {
      const res = await getClientFilingRefund(clientId, filing._id);
      setRefundModal({ open: true, loading: false, status: res.data, filing });
    } catch {
      setRefundModal({ open: true, loading: false, status: null, filing });
    }
  };

  // Generate WhatsApp deep-link for the CA to share manually
  const waLinkFor = (filing) =>
    filing?.approvalToken
      ? `https://wa.me/91${client?.mobile}?text=${encodeURIComponent(
          `Dear ${client?.fullName}, your CA has prepared your ${filing.itrType || "ITR-1"} for FY 2025-26. ` +
          `Refund/Tax details enclosed. Please review and approve: ` +
          `${window.location.origin}/approve/${filing.approvalToken}`
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

  // Header-level action — only meaningful when there's no filing at all yet
  // (pick which ITR type to start). Once any filing exists, each filing's
  // own card/banner below carries its own Continue/Edit/Revise action,
  // since a single header button can't disambiguate between two filings.
  const startFilingMenuItems = [
    itr1Enabled && { key: "itr1", label: ITR_TYPE_LABEL["ITR-1"] },
    itr2Enabled && { key: "itr2", label: ITR_TYPE_LABEL["ITR-2"] },
  ].filter(Boolean);

  const filingActionButton =
    canWrite && filings.length === 0 ? (
      startFilingMenuItems.length > 1 ? (
        <Dropdown menu={{ items: startFilingMenuItems, onClick: ({ key }) => navigate(`/ca/clients/${clientId}/${key}`) }}>
          <Button type="primary" icon={<FileTextOutlined />}>
            Start Filing <DownOutlined />
          </Button>
        </Dropdown>
      ) : (
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          disabled={startFilingMenuItems.length === 0}
          onClick={() => navigate(`/ca/clients/${clientId}/${startFilingMenuItems[0]?.key || "itr1"}`)}
        >
          Start {startFilingMenuItems[0]?.label || "ITR-1"}
        </Button>
      )
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
        extra={filingActionButton}
      />

      {/* ── Client Details — only fields not already visible on the CADashboard
          roster (name/PAN/mobile/email/status are shown there before the CA
          ever opens this page) ──────────────────────────────────────────── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 10, marginBottom: 16 }}
        title={
          <Space>
            <UserOutlined />
            <span>Client Details</span>
          </Space>
        }
      >
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          <Descriptions.Item label={<Space size={4}><ApartmentOutlined />Employer</Space>}>
            {client?.employerName || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={<Space size={4}><EnvironmentOutlined />City</Space>}>
            {client?.city || "—"}
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

      {/* ── Filings — one summary card per non-draft filing (a client can hold
          at most one ITR-1 and one ITR-2 per AY), plus a banner per draft ── */}
      {filings.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="No filing prepared yet"
          description="Start a filing for this client."
          style={{ marginBottom: 16, borderRadius: 8 }}
          action={canWrite && filingActionButton}
        />
      ) : (
        <>
          {draftFilings.map((filing) => (
            <Alert
              key={filing._id}
              type="info"
              showIcon
              message={<Space><span>Draft in progress</span><Tag color="blue">{filing.itrType}</Tag></Space>}
              description="Continue filling the ITR form and submit to proceed."
              style={{ marginBottom: 16, borderRadius: 8 }}
              action={
                canWrite && (
                  <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate(`/ca/clients/${clientId}/${filingPathFor(filing)}`)}>
                    Continue Filing
                  </Button>
                )
              }
            />
          ))}

          {nonDraftFilings.map((filing) => {
            const filingData = filingDataFor(filing);
            const tax        = filingData?.taxComputation || {};
            const waLink     = waLinkFor(filing);
            return (
              <Card
                key={filing._id}
                variant="borderless"
                style={{ borderRadius: 10, marginBottom: 16 }}
                title={
                  <Space>
                    <FileDoneOutlined />
                    <span>Filing Summary</span>
                    <Tag color="purple">{filing.itrType}</Tag>
                    <Tag color="blue">AY {filing.assessmentYear}</Tag>
                  </Space>
                }
                extra={
                  <Space wrap>
                    <Tag color={APPROVAL_COLOR[filing.approvalStatus]}>
                      {filing.approvalStatus?.replace("_", " ").toUpperCase()}
                    </Tag>
                    {canWrite && (
                      <Button size="small" icon={<FileTextOutlined />} onClick={() => navigate(`/ca/clients/${clientId}/${filingPathFor(filing)}`)}>
                        Edit Filing
                      </Button>
                    )}
                  </Space>
                }
              >
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  {[
                    { label: "Gross Salary",  value: filingData?.grossSalary, color: "#1677ff" },
                    { label: "Total Tax",     value: tax.totalTax,    color: "#fa541c"  },
                    { label: "TDS Deducted",  value: filingData?.tdsDeducted, color: "#52c41a" },
                    {
                      label: (filingData?.tdsDeducted || 0) >= (tax.totalTax || 0) ? "Refund Due" : "Tax Payable",
                      value: Math.abs((filingData?.tdsDeducted || 0) - (tax.totalTax || 0)),
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
                {filing.approvalStatus === "not_sent" && (
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
                        <Button
                          type="primary"
                          size="small"
                          icon={<SendOutlined />}
                          loading={sendingApprovalId === filing._id}
                          onClick={() => handleSendApproval(filing)}
                        >
                          Send via Email + SMS
                        </Button>
                      )
                    }
                  />
                )}

                {filing.approvalStatus === "pending" && (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<ClockCircleOutlined />}
                    message="Waiting for client approval"
                    description={`Approval request sent on ${filing.approvalSentAt ? new Date(filing.approvalSentAt).toLocaleDateString("en-IN") : "—"}`}
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

                {filing.approvalStatus === "approved" && filing.efilingStatus !== "submitted" && (
                  <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    message="Client has approved — ready to e-file"
                    description={`Approved on ${filing.approvalRespondedAt ? new Date(filing.approvalRespondedAt).toLocaleDateString("en-IN") : "—"}${!isAdmin ? " — ask your CA Admin to e-file." : ""}`}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    action={
                      isAdmin && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<SafetyCertificateOutlined />}
                          onClick={() => navigate(`/efiling?filingId=${filing._id}`)}
                        >
                          Proceed to e-File
                        </Button>
                      )
                    }
                  />
                )}

                {filing.efilingStatus === "submitted" && (
                  <Alert
                    type="success"
                    showIcon
                    icon={<FileDoneOutlined />}
                    message="Return successfully e-filed with ITD"
                    description={`ITR-V Acknowledgement: ${filing.itrVAckNo || "—"} · Filed on ${filing.efiledAt ? new Date(filing.efiledAt).toLocaleDateString("en-IN") : "—"}`}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    action={
                      <Button size="small" icon={<BankOutlined />} onClick={() => handleTrackRefund(filing)}>
                        Track Refund
                      </Button>
                    }
                  />
                )}

                {filing.approvalStatus === "rejected" && (
                  <Alert
                    type="error"
                    showIcon
                    message="Client requested changes"
                    description={filing.approvalComment ? `Comment: "${filing.approvalComment}"` : "No comment provided."}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    action={
                      canWrite && (
                        <Button size="small" onClick={() => navigate(`/ca/clients/${clientId}/${filingPathFor(filing)}`)}>
                          Revise Filing
                        </Button>
                      )
                    }
                  />
                )}
              </Card>
            );
          })}

          {canWrite && missingType && (
            <Button
              type="dashed"
              icon={<FileTextOutlined />}
              style={{ marginBottom: 16 }}
              onClick={() => navigate(`/ca/clients/${clientId}/${missingType === "ITR-2" ? "itr2" : "itr1"}`)}
            >
              Prepare {ITR_TYPE_LABEL[missingType]}
            </Button>
          )}
        </>
      )}

      {/* ── Filing history ─────────────────────────────────────────────── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 10 }}
        title={
          <Space>
            <FileTextOutlined />
            <span>Filing History</span>
            <Badge count={filings.length} showZero style={{ backgroundColor: token.colorPrimary }} />
          </Space>
        }
      >
        <Table
          dataSource={filings}
          columns={filingColumns}
          rowKey="_id"
          pagination={false}
          size="small"
          locale={{ emptyText: <Empty description="No filings yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      <RefundStatusModal
        open={refundModal.open}
        loading={refundModal.loading}
        status={refundModal.status}
        clientName={client?.fullName}
        onClose={() => setRefundModal({ open: false, loading: false, status: null, filing: null })}
      />
    </div>
  );
}
