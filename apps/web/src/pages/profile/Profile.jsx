import React, { useState, useEffect } from "react";
import {
  Row, Col, Card, Typography, Descriptions, Tag,
  Upload, Button, Table, Alert, message, Popconfirm,
  Spin, Progress, Divider, Space, Badge,
} from "antd";
import {
  UserOutlined, UploadOutlined, FileTextOutlined,
  DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
  InboxOutlined, FilePdfOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../store/index.js";
import { uploadDocument, getMyDocuments, deleteDocument } from "../../services/document.service.js";
import useFeature from "../../hooks/useFeature.js";

const { Title, Text } = Typography;
const { Dragger }     = Upload;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(n || 0);

export default function Profile() {
  const { user }         = useAuthStore();
  const form16Enabled    = useFeature("FORM_16_PARSER");
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [parsedResult, setParsedResult] = useState(null);

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

  const handleUpload = async ({ file }) => {
    setUploading(true);
    setParsedResult(null);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("type", "form16");
      formData.append("financialYear", "2025-26");
      const res = await uploadDocument(formData);
      message.success("Form 16 uploaded and parsed!");
      setParsedResult(res.data?.parsedData);
      fetchDocuments();
    } catch (err) {
      message.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
    return false; // Prevent default upload
  };

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
      <div className="flex items-center gap-3 mb-6">
        <UserOutlined style={{ fontSize: 28, color: "#1677ff" }} />
        <div>
          <Title level={3} style={{ margin: 0 }}>My Profile</Title>
          <Text type="secondary">Account details and document vault</Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* ── Profile Details ─────────────────────────── */}
        <Col xs={24} lg={10}>
          <Card
            bordered={false}
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
        <Col xs={24} lg={14}>
          {form16Enabled && (
            <Card
              bordered={false}
              style={{ borderRadius: 10, marginBottom: 16 }}
              title={
                <Space>
                  <UploadOutlined />
                  <span>Upload Form 16</span>
                </Space>
              }
            >
              <Alert
                message="Upload your Form 16 (Part A & B) PDF to auto-fill your ITR-1 income details."
                type="info"
                showIcon
                style={{ marginBottom: 16, borderRadius: 8 }}
              />

              <Dragger
                name="document"
                accept=".pdf"
                multiple={false}
                beforeUpload={(file) => {
                  handleUpload({ file });
                  return false;
                }}
                showUploadList={false}
                disabled={uploading}
              >
                {uploading ? (
                  <div className="py-4">
                    <Spin size="large" />
                    <p className="mt-3">Uploading and parsing Form 16...</p>
                  </div>
                ) : (
                  <>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined style={{ color: "#1677ff" }} />
                    </p>
                    <p className="ant-upload-text">
                      Click or drag Form 16 PDF here
                    </p>
                    <p className="ant-upload-hint">
                      PDF only · Max 5MB · FY 2025-26
                    </p>
                  </>
                )}
              </Dragger>

              {/* Parsed Result Preview */}
              {parsedResult && (
                <div style={{ marginTop: 16 }}>
                  <Divider orientation="left">
                    <Space>
                      <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      <Text strong>Parsed Data</Text>
                      <Tag color="success">
                        {parsedResult.confidence}% confidence
                      </Tag>
                    </Space>
                  </Divider>
                  <Progress
                    percent={parsedResult.confidence}
                    strokeColor={parsedResult.confidence > 70 ? "#52c41a" : "#faad14"}
                    style={{ marginBottom: 12 }}
                  />
                  <Descriptions column={2} size="small" bordered>
                    {[
                      ["Employer",       parsedResult.employerName],
                      ["Employer TAN",   parsedResult.employerTAN],
                      ["Employee PAN",   parsedResult.employeePAN],
                      ["Financial Year", parsedResult.financialYear],
                      ["Gross Salary",   parsedResult.grossSalary   ? fmt(parsedResult.grossSalary)   : null],
                      ["Basic Salary",   parsedResult.basicSalary   ? fmt(parsedResult.basicSalary)   : null],
                      ["HRA Received",   parsedResult.hraReceived   ? fmt(parsedResult.hraReceived)   : null],
                      ["TDS Deducted",   parsedResult.tdsDeducted   ? fmt(parsedResult.tdsDeducted)   : null],
                    ]
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <Descriptions.Item key={label} label={label}>
                          <Text strong>{value}</Text>
                        </Descriptions.Item>
                      ))}
                  </Descriptions>
                  <Alert
                    style={{ marginTop: 12, borderRadius: 8 }}
                    type="success"
                    message="Go to ITR-1 Filing to use these values. Auto-fill coming soon!"
                    showIcon
                  />
                </div>
              )}
            </Card>
          )}

          {/* Document List */}
          <Card
            bordered={false}
            style={{ borderRadius: 10 }}
            title={
              <Space>
                <FileTextOutlined />
                <span>My Documents</span>
                <Badge count={documents.length} color="#1677ff" />
              </Space>
            }
          >
            <Table
              dataSource={documents}
              columns={docColumns}
              rowKey="_id"
              loading={docsLoading}
              pagination={{ pageSize: 5 }}
              size="small"
              locale={{ emptyText: "No documents uploaded yet" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
