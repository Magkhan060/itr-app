import React, { useEffect, useState } from "react";
import {
  Table, Tag, Button, Input, Space, Select,
  Typography, Popconfirm, message, Card, Row, Col,
} from "antd";
import {
  SearchOutlined, UserOutlined, StopOutlined, CheckOutlined,
} from "@ant-design/icons";
import { getAllUsers, updateUserRole, toggleUserActive } from "../../services/admin.service.js";
import { useAuthStore } from "../../store/index.js";

const { Text } = Typography;

export default function AdminUsers() {
  const { user: currentUser } = useAuthStore();
  const [data, setData]       = useState({ users: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);

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
    } catch (err) { message.error(err.message); }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await toggleUserActive(id, isActive);
      message.success(`User ${isActive ? "activated" : "deactivated"}`);
      fetchUsers();
    } catch (err) { message.error(err.message); }
  };

  const columns = [
    {
      title:  "User",
      key:    "user",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
        </Space>
      ),
    },
    {
      title:     "PAN",
      dataIndex: "pan",
      key:       "pan",
      render:    (p) => <Tag color="blue">{p}</Tag>,
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
        <Tag color={r.isActive ? "success" : "error"}>
          {r.isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title:  "Joined",
      dataIndex: "createdAt",
      key:    "joined",
      render: (d) => new Date(d).toLocaleDateString("en-IN"),
    },
    {
      title:  "Action",
      key:    "action",
      render: (_, r) => (
        r._id === currentUser?.id ? (
          <Tag>You</Tag>
        ) : (
          <Popconfirm
            title={`${r.isActive ? "Deactivate" : "Activate"} this user?`}
            onConfirm={() => handleToggleActive(r._id, !r.isActive)}
          >
            <Button
              size="small"
              danger={r.isActive}
              type={r.isActive ? "default" : "primary"}
              icon={r.isActive ? <StopOutlined /> : <CheckOutlined />}
            >
              {r.isActive ? "Deactivate" : "Activate"}
            </Button>
          </Popconfirm>
        )
      ),
    },
  ];

  return (
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
          <Button type="primary" onClick={() => fetchUsers(1, search)}>
            Search
          </Button>
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
      />
    </Card>
  );
}
