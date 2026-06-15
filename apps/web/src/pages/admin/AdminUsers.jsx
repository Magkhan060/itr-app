import React, { useEffect, useState } from "react";
import {
  Table, Tag, Button, Input, Space, Select,
  Typography, Popconfirm, message, Card, Row, Col,
  Drawer, Avatar, Descriptions, Badge, Divider,
} from "antd";
import {
  SearchOutlined, StopOutlined, CheckOutlined,
  UserOutlined, MailOutlined, PhoneOutlined,
  CalendarOutlined, CrownOutlined,
} from "@ant-design/icons";
import { getAllUsers, updateUserRole, toggleUserActive } from "../../services/admin.service.js";
import { useAuthStore } from "../../store/index.js";

const { Text } = Typography;

const AVATAR_COLORS = ["#1677ff", "#52c41a", "#fa8c16", "#722ed1", "#eb2f96", "#13c2c2"];

const initials = (name) =>
  name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function AdminUsers() {
  const { user: currentUser } = useAuthStore();
  const [data, setData]       = useState({ users: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);

  // Drawer state
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchUsers = async (pg = page, q = search) => {
    setLoading(true);
    try {
      const res = await getAllUsers({ page: pg, limit: 20, search: q });
      setData(res.data);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (id, role) => {
    try {
      await updateUserRole(id, role);
      message.success("Role updated");
      fetchUsers();
      // Sync drawer if open
      if (drawerUser?._id === id) setDrawerUser((u) => ({ ...u, role }));
    } catch (err) { message.error(err.message); }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await toggleUserActive(id, isActive);
      message.success(`User ${isActive ? "activated" : "deactivated"}`);
      fetchUsers();
      if (drawerUser?._id === id) setDrawerUser((u) => ({ ...u, isActive }));
    } catch (err) { message.error(err.message); }
  };

  const openDrawer = (record) => {
    setDrawerUser(record);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: "User",
      key:   "user",
      render: (_, r) => (
        <Space>
          <Avatar size={36} style={{ backgroundColor: avatarColor(r.pan), fontSize: 13 }}>
            {initials(r.fullName)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.fullName}</div>
            <div style={{ color: "#8c8c8c", fontSize: 11 }}>{r.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title:     "PAN",
      dataIndex: "pan",
      key:       "pan",
      render:    (p) => <Tag color="blue" style={{ fontSize: 11 }}>{p}</Tag>,
    },
    {
      title:  "Role",
      key:    "role",
      render: (_, r) => (
        <Select
          value={r.role}
          size="small"
          style={{ width: 100 }}
          disabled={r._id === currentUser?.id}
          onChange={(role) => handleRoleChange(r._id, role)}
          onClick={(e) => e.stopPropagation()}
        >
          <Select.Option value="user">User</Select.Option>
          <Select.Option value="admin">Admin</Select.Option>
        </Select>
      ),
    },
    {
      title:  "Status",
      key:    "status",
      render: (_, r) => (
        <Badge
          status={r.isActive ? "success" : "error"}
          text={<Text style={{ fontSize: 12 }}>{r.isActive ? "Active" : "Inactive"}</Text>}
        />
      ),
    },
    {
      title:     "Joined",
      dataIndex: "createdAt",
      key:       "joined",
      render:    (d) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(d).toLocaleDateString("en-IN")}</Text>,
    },
    {
      title:  "Action",
      key:    "action",
      render: (_, r) =>
        r._id === currentUser?.id ? (
          <Tag>You</Tag>
        ) : (
          <Popconfirm
            title={`${r.isActive ? "Deactivate" : "Activate"} this user?`}
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
      <Card bordered={false} style={{ borderRadius: 10 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex={1}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by name, PAN or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => fetchUsers(1, search)}
              allowClear
              onClear={() => { setSearch(""); fetchUsers(1, ""); }}
            />
          </Col>
          <Col>
            <Button type="primary" onClick={() => fetchUsers(1, search)}>Search</Button>
          </Col>
        </Row>

        <Table
          dataSource={data.users}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            current:   page,
            total:     data.total,
            pageSize:  20,
            onChange:  (p) => { setPage(p); fetchUsers(p); },
            showTotal: (t) => `${t} users`,
          }}
          size="middle"
          onRow={(record) => ({
            onClick: () => openDrawer(record),
            style:   { cursor: "pointer" },
          })}
          rowClassName="hover:bg-gray-50"
        />
      </Card>

      {/* ── User Detail Drawer ──────────────────────── */}
      <Drawer
        title={
          drawerUser ? (
            <Space>
              <Avatar
                size={40}
                style={{ backgroundColor: avatarColor(drawerUser.pan), fontSize: 15 }}
              >
                {initials(drawerUser.fullName)}
              </Avatar>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{drawerUser.fullName}</div>
                <div style={{ color: "#8c8c8c", fontSize: 12, fontWeight: 400 }}>{drawerUser.pan}</div>
              </div>
            </Space>
          ) : "User Details"
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
        extra={
          drawerUser && drawerUser._id !== currentUser?.id && (
            <Popconfirm
              title={`${drawerUser.isActive ? "Deactivate" : "Activate"} ${drawerUser.fullName}?`}
              onConfirm={() => handleToggleActive(drawerUser._id, !drawerUser.isActive)}
            >
              <Button
                size="small"
                danger={drawerUser.isActive}
                type={drawerUser.isActive ? "default" : "primary"}
                icon={drawerUser.isActive ? <StopOutlined /> : <CheckOutlined />}
              >
                {drawerUser.isActive ? "Deactivate" : "Activate"}
              </Button>
            </Popconfirm>
          )
        }
      >
        {drawerUser && (
          <>
            {/* Status badge */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Avatar
                size={72}
                style={{ backgroundColor: avatarColor(drawerUser.pan), fontSize: 28 }}
              >
                {initials(drawerUser.fullName)}
              </Avatar>
              <div style={{ marginTop: 12 }}>
                <Badge
                  status={drawerUser.isActive ? "success" : "error"}
                  text={<Text style={{ fontSize: 13 }}>{drawerUser.isActive ? "Active" : "Inactive"}</Text>}
                />
                {drawerUser.role === "admin" && (
                  <Tag color="gold" icon={<CrownOutlined />} style={{ marginLeft: 8 }}>Admin</Tag>
                )}
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={<Space><UserOutlined /> Full Name</Space>}>
                <Text strong>{drawerUser.fullName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="PAN">
                <Tag color="blue">{drawerUser.pan}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<Space><MailOutlined /> Email</Space>}>
                {drawerUser.email}
              </Descriptions.Item>
              {drawerUser.mobile && (
                <Descriptions.Item label={<Space><PhoneOutlined /> Mobile</Space>}>
                  +91 {drawerUser.mobile}
                </Descriptions.Item>
              )}
              {drawerUser.dateOfBirth && (
                <Descriptions.Item label={<Space><CalendarOutlined /> Date of Birth</Space>}>
                  {new Date(drawerUser.dateOfBirth).toLocaleDateString("en-IN")}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Member Since">
                {new Date(drawerUser.createdAt).toLocaleDateString("en-IN")}
              </Descriptions.Item>
            </Descriptions>

            {drawerUser._id !== currentUser?.id && (
              <>
                <Divider />
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Change Role</Text>
                </div>
                <Select
                  value={drawerUser.role}
                  style={{ width: "100%" }}
                  onChange={(role) => handleRoleChange(drawerUser._id, role)}
                >
                  <Select.Option value="user">
                    <Space><UserOutlined /> Taxpayer (User)</Space>
                  </Select.Option>
                  <Select.Option value="admin">
                    <Space><CrownOutlined /> Administrator</Space>
                  </Select.Option>
                </Select>
              </>
            )}

            {drawerUser._id === currentUser?.id && (
              <>
                <Divider />
                <Text type="secondary" style={{ fontSize: 12 }}>This is your own account.</Text>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
