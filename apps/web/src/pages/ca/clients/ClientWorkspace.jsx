import React, { useEffect, useState } from "react";
import {
  Card, Row, Col, Button, Tag, Typography, Space, Descriptions,
  Table, Alert, Statistic, Divider, Popconfirm, message, Tooltip,
} from "antd";
import {
  EditOutlined, FileTextOutlined,
  SendOutlined, CheckCircleOutlined, FileDoneOutlined,
  ClockCircleOutlined, WhatsAppOutlined, MailOutlined,
  SafetyCertificateOutlined, UserAddOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../../store/index.js";
import {
  getClient, sendApproval,
  sendClientPortalInvite, getClientPortalInviteStatus,
} from "../../../services/ca.service.js";
import PageHeader from "../../../components/PageHeader.jsx";

const { Title, Text } = Typography;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const APPROVAL_COLOR = { not_sent: "default", pending: "orange", approved: "green", rejected: "red" };
const STATUS_COLOR   = { draft: "default", submitted: "blue", verified: "green", processed: "purple" };

export default function ClientWorkspace() {
  const { clientId }  = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuthStore();
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
      .catch(() => {});
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

  return (
    <div>
      <PageHeader
        onBack={() => navigate("/dashboard")}
        title={client?.fullName}
        subtitle={
          <Space size={4}>
            <Text code>{client?.pan}</Text>
            {client?.email && <Text type="secondary" style={{ fontSize: 12 }}>{client.email}</Text>}
          </Space>
        }
        extra={
          <Space>
            {canWrite && (
              <Button icon={<EditOutlined />} onClick={() => navigate(`/ca/clients/${clientId}/edit`)}>Edit Client</Button>
            )}
            {/* Hide the filing button once the return is verified/e-filed — no edits allowed */}
            {canWrite && (!latestFiling || latestFiling.status === "draft") && (
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/ca/clients/${clientId}/itr1`)}
              >
                {latestFiling?.status === "draft" ? "Continue Filing" : "Start ITR-1"}
              </Button>
            )}
            {canWrite && latestFiling?.status === "submitted" && (
              <Button
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/ca/clients/${clientId}/itr1`)}
              >
                Edit Filing
              </Button>
            )}
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        {/* Left: Client info */}
        <Col xs={24} lg={8}>
          <Card variant="borderless" style={{ borderRadius: 10 }} title="Client Details">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">{client?.fullName}</Descriptions.Item>
              <Descriptions.Item label="PAN"><Text code>{client?.pan}</Text></Descriptions.Item>
              <Descriptions.Item label="Mobile">{client?.mobile ? `+91 ${client.mobile}` : "—"}</Descriptions.Item>
              <Descriptions.Item label="Email">{client?.email || "—"}</Descriptions.Item>
              <Descriptions.Item label="Employer">{client?.employerName || "—"}</Descriptions.Item>
              <Descriptions.Item label="City">{client?.city || "—"}</Descriptions.Item>
            </Descriptions>
            {client?.notes && (
              <>
                <Divider style={{ margin: "12px 0" }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Notes: {client.notes}</Text>
              </>
            )}

            <Divider style={{ margin: "12px 0" }} />
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Space size={6}>
                <Text style={{ fontSize: 12 }}>Client Portal</Text>
                <Tag color={PORTAL_STATUS_TAG[portalStatus?.status]?.color || "default"} style={{ fontSize: 11 }}>
                  {PORTAL_STATUS_TAG[portalStatus?.status]?.label || "—"}
                </Tag>
              </Space>
              {canWrite && (portalStatus?.status === "not_invited" || portalStatus?.status === "expired") && (
                <Tooltip title="Invite this client to view their filings, download XML, and track refund status online">
                  <Button
                    size="small"
                    icon={<UserAddOutlined />}
                    loading={invitingPortal}
                    onClick={handleInvitePortal}
                  >
                    Invite to Portal
                  </Button>
                </Tooltip>
              )}
            </Space>
          </Card>
        </Col>

        {/* Right: Latest filing + approval actions */}
        <Col xs={24} lg={16}>
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
                  <Col span={6} key={label}>
                    <Card variant="borderless" style={{ borderRadius: 8, textAlign: "center" }}>
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

          {/* Filing history */}
          <Card variant="borderless" style={{ borderRadius: 10 }} title="Filing History">
            <Table
              dataSource={client?.filings || []}
              columns={filingColumns}
              rowKey="_id"
              pagination={false}
              size="small"
              locale={{ emptyText: "No filings yet" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
