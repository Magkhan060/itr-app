import React, { useState, useEffect } from "react";
import {
  Row, Col, Card, Typography, Descriptions, Tag,
  Button, Table, Alert, message, Popconfirm,
  Divider, Space, Badge,
} from "antd";
import {
  UserOutlined, FileTextOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined, FilePdfOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../store/index.js";
import { getMyDocuments, deleteDocument } from "../../services/document.service.js";
import PageHeader from "../../components/PageHeader.jsx";

const { Title, Text } = Typography;

export default function Profile() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const fetchDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await getMyDocuments();
      setDocuments(res.data || []);
    } catch (_) {} finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      message.success("Document deleted");
      fetchDocuments();
    } catch (err) {
      message.error(err.message);
    }
  };

  const docColumns = [
    {
      title:     "File",
      dataIndex: "originalName",
      key:       "name",
      render:    (name) => (
        <Space>
          <FilePdfOutlined style={{ color: "#ff4d4f" }} />
          <Text>{name}</Text>
        </Space>
      ),
    },
    {
      title:     "Type",
      dataIndex: "type",
      key:       "type",
      render:    (t) => <Tag color="blue">{t?.toUpperCase()}</Tag>,
    },
    {
      title:     "FY",
      dataIndex: "financialYear",
      key:       "fy",
    },
    {
      title:     "Parse Status",
      dataIndex: "parseStatus",
      key:       "status",
      render:    (s) => (
        <Tag
          color={s === "success" ? "success" : s === "failed" ? "error" : "default"}
          icon={s === "success" ? <CheckCircleOutlined /> : s === "failed" ? <CloseCircleOutlined /> : null}
        >
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title:     "Uploaded",
      dataIndex: "createdAt",
      key:       "date",
      render:    (d) => new Date(d).toLocaleDateString("en-IN"),
    },
    {
      title:  "Action",
      key:    "action",
      render: (_, record) => (
        <Popconfirm
          title="Delete this document?"
          onConfirm={() => handleDelete(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <PageHeader icon={<UserOutlined />} title="My Profile" subtitle="Account details and document vault" />

      <Row gutter={[24, 24]}>
        {/* ── Profile Details ─────────────────────────── */}
        <Col xs={24} lg={8}>
          <Card
            variant="borderless"
            style={{ borderRadius: 10 }}
            title={
              <Space>
                <UserOutlined />
                <span>Account Details</span>
              </Space>
            }
          >
            <div className="flex justify-center mb-6">
              <div
                style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "#1677ff", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 32 }}>
                  {user?.fullName?.[0] || "U"}
                </Text>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Full Name">
                <Text strong>{user?.fullName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="PAN">
                <Tag color="blue">{user?.pan}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {user?.email}
              </Descriptions.Item>
              <Descriptions.Item label="Mobile">
                +91 {user?.mobile}
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {user?.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString("en-IN")
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Member Since">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN")
                  : "—"}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Filing year badge */}
            <div className="flex justify-between items-center">
              <Text type="secondary">Current Filing Period</Text>
              <Space>
                <Tag color="green">FY 2025-26</Tag>
                <Tag color="blue">AY 2026-27</Tag>
              </Space>
            </div>
          </Card>
        </Col>

        {/* ── Document Vault ──────────────────────────── */}
        <Col xs={24} lg={16}>
          <Card
            variant="borderless"
            style={{ borderRadius: 10 }}
            title={
              <Space>
                <FileTextOutlined />
                <span>My Documents</span>
                <Badge count={documents.length} color="#1677ff" />
              </Space>
            }
          >
            <Alert
              message="Upload Form 16, 26AS, or AIS from the File ITR page — uploaded documents appear here for your records."
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
            <Table
              dataSource={documents}
              columns={docColumns}
              rowKey="_id"
              loading={docsLoading}
              pagination={{ pageSize: 8 }}
              size="small"
              locale={{ emptyText: "No documents uploaded yet" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
