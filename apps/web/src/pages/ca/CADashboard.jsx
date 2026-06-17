import React, { useEffect, useState } from "react";
import {
  Row, Col, Card, Table, Tag, Typography, Button,
  Space, Statistic, Badge, Empty, Avatar, Input,
  Tabs, Form, Alert, message, Divider, Tooltip,
  Modal, Select, Popconfirm, Drawer,
} from "antd";
import {
  TeamOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileDoneOutlined, PlusOutlined,
  SearchOutlined, AuditOutlined, ArrowRightOutlined,
  SendOutlined, SettingOutlined, ApiOutlined, SafetyCertificateOutlined,
  EyeInvisibleOutlined, EyeTwoTone, UserAddOutlined, MailOutlined,
  StopOutlined, CheckOutlined, CrownOutlined, EyeOutlined,
  EditOutlined, DeleteOutlined, ExclamationCircleOutlined,
  CalendarOutlined, DollarOutlined,
} from "@ant-design/icons";
import { Timeline } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import {
  listClients, deleteClient, getCAProfile, updateCAProfile,
  listFirmMembers, inviteFirmMember, revokeInvite, updateMemberRole, toggleMemberActive,
} from "../../services/ca.service.js";
import ClientForm from "./clients/ClientForm.jsx";
import { COMPLIANCE_CALENDAR_AY_2026_27 } from "@itr-app/shared-types";

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

const ROLE_LABEL = {
  ca_admin:    "CA Admin",
  ca_staff:    "Team Member",
  ca_readonly: "Read-Only",
};

const ROLE_COLOR = {
  ca_admin:    "gold",
  ca_staff:    "blue",
  ca_readonly: "default",
};

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function CASettingsPanel() {
  const [form]         = Form.useForm();
  const [saving, setSaving]       = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);

  useEffect(() => {
    getCAProfile()
      .then((res) => {
        const p = res.data;
        form.setFieldsValue({
          caFirmName:     p.caFirmName,
          caMemberNo:     p.caMemberNo,
          caItdApiBaseUrl: p.caItdApiBaseUrl,
          caItdApiKey:    "",  // never pre-fill — user must re-enter to change
        });
        setKeyConfigured(p.caItdApiKeyConfigured);
        setProfileLoaded(true);
      })
      .catch(() => message.error("Failed to load profile"));
  }, []);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        caFirmName:      values.caFirmName,
        caMemberNo:      values.caMemberNo,
        caItdApiBaseUrl: values.caItdApiBaseUrl || "",
      };
      // Only send the key field if the user typed something (empty = no change)
      if (values.caItdApiKey !== undefined) {
        payload.caItdApiKey = values.caItdApiKey;
      }
      const res = await updateCAProfile(payload);
      setKeyConfigured(res.data.caItdApiKeyConfigured);
      form.setFieldsValue({ caItdApiKey: "" });
      message.success("Profile saved");
    } catch (err) {
      message.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!profileLoaded) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 640 }}>
      {/* ── Practice Details ─────────────────────────────────── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 10, border: "1px solid #f0f0f0", marginBottom: 20 }}
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: "#722ed1" }} />
            <span>Practice Details</span>
          </Space>
        }
      >
        <Form.Item label="Firm / Practice Name" name="caFirmName">
          <Input placeholder="e.g. Kumar & Associates" />
        </Form.Item>
        <Form.Item label="ICAI Membership Number" name="caMemberNo">
          <Input placeholder="e.g. 123456" style={{ maxWidth: 220 }} />
        </Form.Item>
      </Card>

      {/* ── ITD ERI / ASP Credentials ───────────────────────── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 10, border: "1px solid #f0f0f0", marginBottom: 20 }}
        title={
          <Space>
            <ApiOutlined style={{ color: "#1677ff" }} />
            <span>ITD ERI / ASP Credentials</span>
            {keyConfigured
              ? <Tag color="success" icon={<CheckCircleOutlined />}>Key Configured</Tag>
              : <Tag color="default">Using Platform Key</Tag>
            }
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
          message="These credentials are optional."
          description={
            <>
              If you have registered as an ERI/ASP with the Income Tax Department under your own firm,
              enter your ITD API Base URL and API Key here. Returns you prepare for clients will be
              submitted using your firm's credentials. If left blank, the platform's shared ERI key
              is used instead.
            </>
          }
        />
        <Form.Item label="ITD API Base URL" name="caItdApiBaseUrl">
          <Input placeholder="https://eportal.incometax.gov.in/oas/efilingapi" />
        </Form.Item>
        <Form.Item
          label={
            <Space>
              <span>ITD API Key</span>
              {keyConfigured && (
                <Tooltip title="A key is already stored. Enter a new value to replace it, or leave blank to keep the existing key.">
                  <Tag color="green" style={{ fontSize: 11 }}>●&nbsp;Stored</Tag>
                </Tooltip>
              )}
            </Space>
          }
          name="caItdApiKey"
        >
          <Input.Password
            placeholder={keyConfigured ? "Enter new key to replace existing" : "Paste your ITD ERI API key"}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>
        <Alert
          type="warning"
          showIcon
          style={{ borderRadius: 8 }}
          message="The API key is encrypted with AES-256 before storage and is never returned in API responses."
        />
      </Card>

      <Button type="primary" htmlType="submit" loading={saving} size="large">
        Save Settings
      </Button>
    </Form>
  );
}

function CATeamPanel({ isAdmin, currentUserId }) {
  const [members, setMembers]   = useState([]);
  const [invites, setInvites]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm] = Form.useForm();

  const load = () => {
    setLoading(true);
    listFirmMembers()
      .then((res) => {
        setMembers(res.data?.members || []);
        setInvites(res.data?.pendingInvites || []);
      })
      .catch(() => message.error("Failed to load team"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleInvite = async (values) => {
    setInviting(true);
    try {
      await inviteFirmMember(values);
      message.success(`Invite sent to ${values.email}`);
      setInviteOpen(false);
      inviteForm.resetFields();
      load();
    } catch (err) {
      message.error(err.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (inviteId) => {
    try {
      await revokeInvite(inviteId);
      message.success("Invite revoked");
      load();
    } catch (err) {
      message.error(err.message || "Failed to revoke invite");
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await updateMemberRole(userId, role);
      message.success("Role updated");
      load();
    } catch (err) {
      message.error(err.message || "Failed to update role");
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await toggleMemberActive(userId, isActive);
      message.success(`Member ${isActive ? "activated" : "deactivated"}`);
      load();
    } catch (err) {
      message.error(err.message || "Failed to update member");
    }
  };

  const memberColumns = [
    {
      title:  "Name",
      key:    "name",
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: r.role === "ca_admin" ? "#faad14" : "#1677ff", fontSize: 13 }}>
            {r.fullName?.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>
              {r.fullName} {r._id === currentUserId && <Tag style={{ marginLeft: 6, fontSize: 10 }}>You</Tag>}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title:  "Role",
      key:    "role",
      render: (_, r) =>
        r.role === "ca_admin" || !isAdmin || r._id === currentUserId ? (
          <Tag color={ROLE_COLOR[r.role]} icon={r.role === "ca_admin" ? <CrownOutlined /> : null}>
            {ROLE_LABEL[r.role] || r.role}
          </Tag>
        ) : (
          <Select
            value={r.role}
            size="small"
            style={{ width: 140 }}
            onChange={(role) => handleRoleChange(r._id, role)}
          >
            <Select.Option value="ca_staff">Team Member</Select.Option>
            <Select.Option value="ca_readonly">Read-Only</Select.Option>
          </Select>
        ),
    },
    {
      title:  "Status",
      key:    "status",
      render: (_, r) => (
        <Badge status={r.isActive ? "success" : "error"} text={r.isActive ? "Active" : "Inactive"} />
      ),
    },
    {
      title:  "Action",
      key:    "action",
      render: (_, r) =>
        r.role === "ca_admin" || r._id === currentUserId || !isAdmin ? null : (
          <Popconfirm
            title={`${r.isActive ? "Deactivate" : "Activate"} this member?`}
            onConfirm={() => handleToggleActive(r._id, !r.isActive)}
          >
            <Tooltip title={r.isActive ? "Deactivate" : "Activate"}>
              <Button size="small" danger={r.isActive} icon={r.isActive ? <StopOutlined /> : <CheckOutlined />} />
            </Tooltip>
          </Popconfirm>
        ),
    },
  ];

  const inviteColumns = [
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title:  "Role",
      key:    "role",
      render: (_, r) => <Tag color={ROLE_COLOR[r.role]}>{ROLE_LABEL[r.role]}</Tag>,
    },
    {
      title:     "Expires",
      dataIndex: "expiresAt",
      key:       "expires",
      render:    (d) => new Date(d).toLocaleDateString("en-IN"),
    },
    {
      title:  "Action",
      key:    "action",
      render: (_, r) => (
        <Popconfirm title="Revoke this invite?" onConfirm={() => handleRevoke(r._id)}>
          <Tooltip title="Revoke">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Card
        variant="borderless"
        style={{ borderRadius: 10, marginBottom: 20 }}
        title={
          <Space>
            <TeamOutlined />
            <span>Firm Team</span>
            <Badge count={members.length} showZero style={{ backgroundColor: "#1677ff" }} />
          </Space>
        }
        extra={
          isAdmin && (
            <Tooltip title="Invite Team Member">
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => setInviteOpen(true)} />
            </Tooltip>
          )
        }
      >
        <Table dataSource={members} columns={memberColumns} rowKey="_id" loading={loading} pagination={false} size="middle" />
      </Card>

      {isAdmin && invites.length > 0 && (
        <Card
          variant="borderless"
          style={{ borderRadius: 10 }}
          title={<Space><MailOutlined /><span>Pending Invites</span></Space>}
        >
          <Table dataSource={invites} columns={inviteColumns} rowKey="_id" pagination={false} size="middle" />
        </Card>
      )}

      <Modal
        title="Invite Team Member"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
          <Form.Item name="email" label="Email Address" rules={[{ required: true }, { type: "email", message: "Invalid email" }]}>
            <Input prefix={<MailOutlined />} placeholder="colleague@example.com" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]} initialValue="ca_staff">
            <Select>
              <Select.Option value="ca_staff">
                <Space><TeamOutlined /> Team Member — can manage clients & prepare drafts</Space>
              </Select.Option>
              <Select.Option value="ca_readonly">
                <Space><EyeOutlined /> Read-Only — view clients & filings only</Space>
              </Select.Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={inviting} block icon={<MailOutlined />}>
            Send Invite
          </Button>
        </Form>
      </Modal>
    </>
  );
}

// Statutory due dates — sidebar next to the client roster, never client-specific data.
function ComplianceCalendar() {
  const today = new Date();

  const items = COMPLIANCE_CALENDAR_AY_2026_27.map((entry) => {
    const due      = new Date(entry.date);
    const isPast   = due < today;
    const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    const urgent   = !isPast && daysLeft <= 14;

    return {
      color: isPast ? "gray" : urgent ? "red" : entry.type === "advance_tax" ? "blue" : "orange",
      children: (
        <div style={{ opacity: isPast ? 0.5 : 1 }}>
          <Space size={4}>
            <Text strong style={{ fontSize: 12 }}>{entry.label}</Text>
            {urgent && <Tag color="red" style={{ fontSize: 10, marginInlineStart: 0 }}>{daysLeft}d left</Tag>}
          </Space>
          <div style={{ fontSize: 11, color: "#8c8c8c" }}>
            {due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
          {entry.description && (
            <div style={{ fontSize: 11, color: "#bfbfbf", marginTop: 2 }}>{entry.description}</div>
          )}
        </div>
      ),
    };
  });

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 10 }}
      title={<Space><CalendarOutlined style={{ color: "#fa8c16" }} /><span>Compliance Calendar</span></Space>}
      extra={<Tag color="blue">AY 2026-27</Tag>}
    >
      <Timeline items={items} style={{ marginTop: 8 }} />
      <Text type="secondary" style={{ fontSize: 10 }}>
        Statutory baseline dates — CBDT may extend by circular.
      </Text>
    </Card>
  );
}

export default function CADashboard() {
  const { user }    = useAuthStore();
  const navigate    = useNavigate();
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");

  // Drawer-based add/edit — mirrors the CEList/CEForm pattern (no route navigation)
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);

  const isAdmin   = user?.role === "ca_admin";
  const canWrite  = user?.role !== "ca_readonly";

  const load = () => {
    setLoading(true);
    listClients()
      .then((res) => setClients(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreateDrawer = () => {
    setEditingClientId(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (clientId) => {
    setEditingClientId(clientId);
    setDrawerOpen(true);
  };

  const handleFormSuccess = () => {
    message.success(editingClientId ? "Client updated successfully!" : "Client added successfully!");
    setDrawerOpen(false);
    setEditingClientId(null);
    load();
  };

  const handleDelete = async (clientId) => {
    try {
      await deleteClient(clientId);
      message.success("Client removed");
      load();
    } catch (err) {
      message.error(err.message || "Failed to remove client");
    }
  };

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
  // "Pending Approval" and "No Filing Yet" are mutually exclusive (the former always has a filing) —
  // their sum is the count of clients that need the CA's attention right now.
  const actionRequired = pending + noFiling;

  const columns = [
    {
      title:  "Client",
      key:    "client",
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
      render: (_, r) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Avatar style={{ backgroundColor: "#1677ff", fontSize: 13 }}>
            {r.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.fullName}</div>
            <Text type="secondary" copyable={{ text: r.pan }} style={{ fontSize: 11 }}>{r.pan}</Text>
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
      filters: [
        { text: "Draft",      value: "draft" },
        { text: "Submitted",  value: "submitted" },
        { text: "Verified",   value: "verified" },
        { text: "Processed",  value: "processed" },
        { text: "No Filing",  value: "no_filing" },
      ],
      onFilter: (value, r) =>
        value === "no_filing" ? !r.latestFiling : r.latestFiling?.status === value,
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
        <Space onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Open Workspace">
            <Button
              type="primary"
              ghost
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate(`/ca/clients/${r._id}`)}
            />
          </Tooltip>
          {canWrite && (
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(r._id)} />
            </Tooltip>
          )}
          {canWrite && (
            <Popconfirm title="Remove this client?" onConfirm={() => handleDelete(r._id)}>
              <Tooltip title="Delete">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key:   "clients",
      label: <Space><TeamOutlined />Clients</Space>,
      children: (
        <>
          {/* Pipeline stats — "Action Required" surfaces what needs the CA's attention right now */}
          <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
            {[
              { label: "Total Clients",    value: total,         icon: <TeamOutlined />,              color: "#1677ff" },
              { label: "Action Required",  value: actionRequired, icon: <ExclamationCircleOutlined />, color: "#fa8c16" },
              { label: "Pending Approval", value: pending,       icon: <ClockCircleOutlined />,       color: "#faad14" },
              { label: "Client Approved",  value: approved,      icon: <CheckCircleOutlined />,       color: "#52c41a" },
              { label: "e-Filed",          value: filed,         icon: <FileDoneOutlined />,           color: "#722ed1" },
              { label: "No Filing Yet",    value: noFiling,      icon: <FileTextOutlined />,           color: "#8c8c8c" },
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

          <Row gutter={[16, 16]}>
            {/* Client table */}
            <Col xs={24} xl={18}>
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
                  <Space>
                    <Input
                      prefix={<SearchOutlined />}
                      placeholder="Search by name, PAN, email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: 260 }}
                    />
                    {canWrite && (
                      <Tooltip title="Add Client">
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer} />
                      </Tooltip>
                    )}
                  </Space>
                }
              >
                {clients.length === 0 && !loading ? (
                  <Empty
                    description={canWrite ? "No clients yet. Add your first client to get started." : "No clients yet."}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    {canWrite && (
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                        Add First Client
                      </Button>
                    )}
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
            </Col>

            {/* Compliance calendar sidebar */}
            <Col xs={24} xl={6}>
              <ComplianceCalendar />
            </Col>
          </Row>
        </>
      ),
    },
    {
      key:   "team",
      label: <Space><UserAddOutlined />Team</Space>,
      children: <CATeamPanel isAdmin={isAdmin} currentUserId={user?.id} />,
    },
  ];

  if (isAdmin) {
    tabItems.push({
      key:   "settings",
      label: <Space><SettingOutlined />Settings</Space>,
      children: <CASettingsPanel />,
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <AuditOutlined style={{ fontSize: 28, color: "#722ed1" }} />
        <div>
          <Title level={3} style={{ margin: 0 }}>CA Dashboard</Title>
          <Text type="secondary">{user?.caFirmName || "Tax Practice"} · FY 2025-26</Text>
        </div>
      </div>

      <Tabs defaultActiveKey="clients" items={tabItems} />

      {/* Add/Edit Client — Drawer, no route navigation (CEList/CEForm pattern) */}
      <Drawer
        title={editingClientId ? "Edit Client" : "Add New Client"}
        width={640}
        onClose={() => { setDrawerOpen(false); setEditingClientId(null); }}
        open={drawerOpen}
        destroyOnClose
      >
        <ClientForm
          clientId={editingClientId}
          onSuccess={handleFormSuccess}
          onCancel={() => { setDrawerOpen(false); setEditingClientId(null); }}
        />
      </Drawer>
    </div>
  );
}
