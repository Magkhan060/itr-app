import React, { useState, useEffect } from "react";
import {
  Card, Form, Input, Button, Typography,
  DatePicker, message, Alert, Spin, Result, Tag, Space,
} from "antd";
import {
  UserOutlined, LockOutlined, IdcardOutlined,
  PhoneOutlined, FileDoneOutlined, TeamOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import { getInviteInfo, acceptInvite } from "../../services/ca.service.js";

const { Title, Text } = Typography;

const ROLE_LABEL = { ca_staff: "Team Member", ca_readonly: "Read-Only Viewer" };

export default function JoinFirm() {
  const { token } = useParams();
  const navigate   = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [form] = Form.useForm();

  const [invite, setInvite]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getInviteInfo(token)
      .then((res) => setInvite(res.data))
      .catch((err) => setError(err.response?.data?.error || "This invite link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        pan:         values.pan.toUpperCase(),
        fullName:    values.fullName,
        mobile:      values.mobile,
        password:    values.password,
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
      };
      const res = await acceptInvite(token, payload);
      setToken(res.data.token);
      setUser(res.data.user);
      message.success("Account created — welcome to the team!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" tip="Loading invite…" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: 480, borderRadius: 12, width: "90%" }}>
          <Result status="error" title="Invite Link Invalid" subTitle={error} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5" }} className="flex items-center justify-center py-8">
      <Card style={{ width: 540, borderRadius: 12 }} styles={{ body: { padding: "40px" } }}>
        <div className="flex flex-col items-center mb-8">
          <FileDoneOutlined style={{ fontSize: 36, color: "#1677ff" }} />
          <Title level={3} style={{ marginTop: 10, marginBottom: 4 }}>Join {invite.firmName || "the Firm"}</Title>
          <Space>
            <Text type="secondary">You've been invited as a</Text>
            <Tag icon={<TeamOutlined />} color="blue">{ROLE_LABEL[invite.role] || invite.role}</Tag>
          </Space>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} style={{ marginBottom: 20 }} />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item label="Email">
            <Input value={invite.email} disabled />
          </Form.Item>

          <Form.Item
            name="pan"
            label="PAN Number"
            rules={[
              { required: true, message: "PAN is required" },
              { pattern: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, message: "Invalid PAN (e.g. ABCDE1234F)" },
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="ABCDE1234F"
              maxLength={10}
              onChange={(e) => form.setFieldValue("pan", e.target.value.toUpperCase())}
            />
          </Form.Item>

          <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: "Full name is required" }, { min: 3 }]}>
            <Input prefix={<UserOutlined />} placeholder="Your full name" />
          </Form.Item>

          <Form.Item name="dateOfBirth" label="Date of Birth">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabledDate={(d) => d && d.isAfter(new Date())} />
          </Form.Item>

          <Form.Item
            name="mobile"
            label="Mobile Number"
            rules={[{ required: true }, { pattern: /^[6-9]\d{9}$/, message: "Invalid Indian mobile number" }]}
          >
            <Input prefix={<PhoneOutlined />} addonBefore="+91" placeholder="9876543210" maxLength={10} />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true },
              { min: 8, message: "At least 8 characters" },
              { pattern: /[A-Z]/, message: "Must contain an uppercase letter" },
              { pattern: /[0-9]/, message: "Must contain a number" },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Min 8 chars, 1 uppercase, 1 number" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Re-enter password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
            Create Account & Join
          </Button>
        </Form>
      </Card>
    </div>
  );
}
