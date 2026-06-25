import React, { useEffect, useState } from "react";
import {
  Table, Tag, Button, Input, Space, Typography, Popconfirm, message,
  Card, Row, Col, Drawer, Avatar, Descriptions, Badge, Divider, Statistic,
  theme as antdTheme,
} from "antd";
import {
  SearchOutlined, StopOutlined, CheckOutlined, BankOutlined,
  UserOutlined, MailOutlined, PhoneOutlined, TeamOutlined,
  FileTextOutlined, IdcardOutlined,
} from "@ant-design/icons";
import { getAllFirms, getFirmDetail, toggleFirmActive } from "../../services/admin.service.js";

const { Text } = Typography;

const initials = (name) =>
  name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

export default function AdminFirms() {
  const { token } = antdTheme.useToken();
  const [data, setData]       = useState({ firms: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);

  const [drawerFirm, setDrawerFirm]   = useState(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchFirms = async (pg = page, q = search) => {
    setLoading(true);
    try {
      const res = await getAllFirms({ page: pg, limit: 20, search: q });
      setData(res.data);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFirms(); }, []);

  const handleToggleActive = async (id, isActive) => {
    try {
      await toggleFirmActive(id, isActive);
      message.success(`Firm ${isActive ? "activated" : "deactivated"} — all firm members ${isActive ? "restored" : "blocked from login"}`);
      fetchFirms();
      if (drawerFirm?._id === id) openDrawer({ _id: id });
    } catch (err) { message.error(err.message); }
  };

  const openDrawer = async (record) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const res = await getFirmDetail(record._id);
      setDrawerFirm(res.data);
    } catch (err) {
      message.error(err.message);
    } finally {
      setDrawerLoading(false);
    }
  };

  const columns = [
    {
      title: "Firm",
      key:   "firm",
      render: (_, r) => (
        <Space>
          <Avatar size={36} icon={<BankOutlined />} style={{ backgroundColor: "#1677ff" }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.firmName || "—"}</div>
            <div style={{ color: token.colorTextSecondary, fontSize: 11 }}>{r.icaiMemberNo ? `ICAI: ${r.icaiMemberNo}` : "No ICAI number on file"}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "CA Admin",
      key:   "admin",
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 13 }}>{r.adminUserId?.fullName || "—"}</div>
          <div style={{ color: token.colorTextSecondary, fontSize: 11 }}>{r.adminUserId?.email}</div>
        </div>
      ),
    },
    {
      title:  "Team",
      key:    "members",
      align:  "center",
      render: (_, r) => <Tag icon={<TeamOutlined />}>{r.memberCount}</Tag>,
    },
    {
      title:  "Clients",
      key:    "clients",
      align:  "center",
      render: (_, r) => <Tag color="blue">{r.clientCount}</Tag>,
    },
    {
      title:  "Filings",
      key:    "filings",
      align:  "center",
      render: (_, r) => <Tag color="purple">{r.filingCount}</Tag>,
    },
    {
      title:  "Status",
      key:    "status",
      render: (_, r) => (
        <Badge
          status={r.isActive ? "success" : "error"}
          text={<Text style={{ fontSize: 12 }}>{r.isActive ? "Active" : "Deactivated"}</Text>}
        />
      ),
    },
    {
      title:  "Action",
      key:    "action",
      render: (_, r) => (
        <Popconfirm
          title={`${r.isActive ? "Deactivate" : "Activate"} this firm?`}
          description={r.isActive ? `This blocks ${r.memberCount} team member(s) from logging in.` : `This restores login access for ${r.memberCount} team member(s).`}
          onConfirm={() => handleToggleActive(r._id, !r.isActive)}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="small"
            danger={r.isActive}
            type={r.isActive ? "default" : "primary"}
            icon={r.isActive ? <StopOutlined /> : <CheckOutlined />}
            onClick={(e) => e.stopPropagation()}
          >
            {r.isActive ? "Deactivate" : "Activate"}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Card variant="borderless" style={{ borderRadius: 10 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex={1}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by firm name or ICAI number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => fetchFirms(1, search)}
              allowClear
              onClear={() => { setSearch(""); fetchFirms(1, ""); }}
            />
          </Col>
          <Col>
            <Button type="primary" onClick={() => fetchFirms(1, search)}>Search</Button>
          </Col>
        </Row>

        <Table
          dataSource={data.firms}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            current:   page,
            total:     data.total,
            pageSize:  20,
            onChange:  (p) => { setPage(p); fetchFirms(p); },
            showTotal: (t) => `${t} firms`,
          }}
          size="middle"
          onRow={(record) => ({
            onClick: () => openDrawer(record),
            style:   { cursor: "pointer" },
          })}
        />
      </Card>

      {/* ── Firm Detail Drawer ──────────────────────── */}
      <Drawer
        title={
          drawerFirm ? (
            <Space>
              <Avatar size={40} icon={<BankOutlined />} style={{ backgroundColor: "#1677ff" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{drawerFirm.firmName || "Unnamed Firm"}</div>
                <div style={{ color: token.colorTextSecondary, fontSize: 12, fontWeight: 400 }}>{drawerFirm.icaiMemberNo || "No ICAI number"}</div>
              </div>
            </Space>
          ) : "Firm Details"
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerFirm(null); }}
        width={460}
        loading={drawerLoading}
        extra={
          drawerFirm && (
            <Popconfirm
              title={`${drawerFirm.isActive ? "Deactivate" : "Activate"} ${drawerFirm.firmName || "this firm"}?`}
              description={drawerFirm.isActive ? `This blocks ${drawerFirm.memberCount} team member(s) from logging in.` : `This restores login access for ${drawerFirm.memberCount} team member(s).`}
              onConfirm={() => handleToggleActive(drawerFirm._id, !drawerFirm.isActive)}
            >
              <Button
                size="small"
                danger={drawerFirm.isActive}
                type={drawerFirm.isActive ? "default" : "primary"}
                icon={drawerFirm.isActive ? <StopOutlined /> : <CheckOutlined />}
              >
                {drawerFirm.isActive ? "Deactivate" : "Activate"}
              </Button>
            </Popconfirm>
          )
        }
      >
        {drawerFirm && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Badge
                status={drawerFirm.isActive ? "success" : "error"}
                text={<Text style={{ fontSize: 13 }}>{drawerFirm.isActive ? "Active" : "Deactivated"}</Text>}
              />
            </div>

            <Row gutter={12} style={{ marginBottom: 20 }}>
              <Col span={8}><Card size="small" variant="borderless" style={{ textAlign: "center", background: token.colorFillAlter }}><Statistic title="Team" value={drawerFirm.memberCount} prefix={<TeamOutlined />} /></Card></Col>
              <Col span={8}><Card size="small" variant="borderless" style={{ textAlign: "center", background: token.colorFillAlter }}><Statistic title="Clients" value={drawerFirm.clientCount} prefix={<IdcardOutlined />} /></Card></Col>
              <Col span={8}><Card size="small" variant="borderless" style={{ textAlign: "center", background: token.colorFillAlter }}><Statistic title="Filings" value={drawerFirm.filingCount} prefix={<FileTextOutlined />} /></Card></Col>
            </Row>

            <Descriptions column={1} size="small" bordered title="Firm Admin">
              <Descriptions.Item label={<Space><UserOutlined /> Name</Space>}>
                {drawerFirm.adminUserId?.fullName || "—"}
              </Descriptions.Item>
              <Descriptions.Item label={<Space><MailOutlined /> Email</Space>}>
                {drawerFirm.adminUserId?.email || "—"}
              </Descriptions.Item>
              {drawerFirm.adminUserId?.mobile && (
                <Descriptions.Item label={<Space><PhoneOutlined /> Mobile</Space>}>
                  +91 {drawerFirm.adminUserId.mobile}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Team Members ({drawerFirm.members?.length || 0})</Text>
            </div>
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              {(drawerFirm.members || []).map((m) => (
                <Card key={m._id} size="small" variant="borderless" style={{ background: token.colorFillAlter }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.fullName}</div>
                      <div style={{ fontSize: 11, color: token.colorTextSecondary }}>{m.email}</div>
                    </Col>
                    <Col>
                      <Space size={4}>
                        <Tag style={{ fontSize: 11 }}>{m.role.replace("ca_", "")}</Tag>
                        <Badge status={m.isActive ? "success" : "error"} />
                      </Space>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          </>
        )}
      </Drawer>
    </>
  );
}
