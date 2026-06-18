import React, { useEffect, useState } from "react";
import {
  Table, Tag, Card, Typography, Select, Space, message,
  Avatar, Tooltip, Alert, Badge,
} from "antd";
import {
  SwapOutlined, CheckCircleOutlined, StopOutlined,
  ControlOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { getAuditLogs } from "../../services/admin.service.js";

const { Text } = Typography;

const ACTION_META = {
  ROLE_CHANGE:      { color: "gold",    icon: <SwapOutlined />,        label: "Role Changed"     },
  USER_ACTIVATED:   { color: "success", icon: <CheckCircleOutlined />, label: "User Activated"   },
  USER_DEACTIVATED: { color: "error",   icon: <StopOutlined />,        label: "User Deactivated" },
  FLAG_TOGGLED:     { color: "blue",    icon: <ControlOutlined />,     label: "Flag Toggled"     },
};

const AVATAR_COLORS = ["#1677ff", "#52c41a", "#fa8c16", "#722ed1", "#eb2f96"];
const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const initials    = (name) =>
  name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

const renderChange = (before, after) => {
  if (!before && !after) return <Text type="secondary">—</Text>;
  const b = JSON.stringify(before ?? {}).replace(/[{}"]/g, "");
  const a = JSON.stringify(after  ?? {}).replace(/[{}"]/g, "");
  return (
    <Space size={4} wrap>
      <Tag style={{ fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
        {b || "—"}
      </Tag>
      <SwapOutlined style={{ color: "#8c8c8c", fontSize: 10 }} />
      <Tag color="blue" style={{ fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
        {a || "—"}
      </Tag>
    </Space>
  );
};

export default function AdminAuditLog() {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [actionFilter, setActionFilter] = useState(undefined);

  const fetch = async (pg = 1, act = actionFilter) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 50 };
      if (act) params.action = act;
      const res = await getAuditLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      message.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const columns = [
    {
      title: "Admin",
      key:   "admin",
      width: 200,
      render: (_, r) => (
        <Space>
          <Avatar
            size={32}
            style={{ backgroundColor: avatarColor(r.adminId?.pan), fontSize: 12 }}
          >
            {initials(r.adminId?.fullName)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{r.adminId?.fullName || "Unknown"}</div>
            <div style={{ color: "#8c8c8c", fontSize: 11 }}>{r.adminId?.pan || "—"}</div>
          </div>
        </Space>
      ),
    },
    {
      title:  "Action",
      key:    "action",
      width:  160,
      render: (_, r) => {
        const meta = ACTION_META[r.action];
        return meta ? (
          <Tag color={meta.color} icon={meta.icon} style={{ fontSize: 11 }}>
            {meta.label}
          </Tag>
        ) : (
          <Tag>{r.action}</Tag>
        );
      },
    },
    {
      title:  "Target",
      key:    "target",
      width:  160,
      render: (_, r) => {
        if (r.targetKey) {
          return <Tag color="cyan" style={{ fontSize: 11 }}>{r.targetKey}</Tag>;
        }
        if (r.targetId) {
          return (
            <Tooltip title={r.targetId}>
              <Text code style={{ fontSize: 10 }}>
                {String(r.targetId).slice(-8)}…
              </Text>
            </Tooltip>
          );
        }
        return <Text type="secondary">—</Text>;
      },
    },
    {
      title:  "Change",
      key:    "change",
      render: (_, r) => renderChange(r.before, r.after),
    },
    {
      title:     "Timestamp",
      dataIndex: "createdAt",
      key:       "ts",
      width:     160,
      render:    (d) => (
        <Tooltip title={new Date(d).toLocaleString("en-IN")}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(d).toLocaleDateString("en-IN")}{" "}
            {new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <Alert
        message={
          <Space>
            <InfoCircleOutlined />
            <Text style={{ fontSize: 13 }}>
              All admin actions are immutably recorded here for compliance and audit purposes.
            </Text>
          </Space>
        }
        type="info"
        style={{ marginBottom: 16, borderRadius: 8 }}
      />

      <Card variant="borderless" style={{ borderRadius: 10 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}
        >
          <Space>
            <Badge count={total} overflowCount={9999} style={{ backgroundColor: "#1677ff" }} />
            <Text type="secondary" style={{ fontSize: 13 }}>total entries</Text>
          </Space>
          <Select
            placeholder="Filter by action"
            allowClear
            style={{ width: 200 }}
            value={actionFilter}
            onChange={(v) => {
              setActionFilter(v);
              setPage(1);
              fetch(1, v);
            }}
            options={Object.entries(ACTION_META).map(([k, v]) => ({
              value: k,
              label: (
                <Space size={4}>
                  <Tag color={v.color} style={{ fontSize: 11 }}>{v.label}</Tag>
                </Space>
              ),
            }))}
          />
        </div>

        <Table
          dataSource={logs}
          columns={columns}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 700 }}
          pagination={{
            current:  page,
            total,
            pageSize: 50,
            onChange: (p) => { setPage(p); fetch(p); },
            showTotal: (t, [s, e]) => `${s}–${e} of ${t} entries`,
            showSizeChanger: false,
          }}
          size="middle"
          locale={{ emptyText: "No audit events recorded yet." }}
        />
      </Card>
    </>
  );
}
