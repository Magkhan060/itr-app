import React, { useState, useEffect } from "react";
import {
  Form, Input, Button, Typography,
  message, Alert, Spin, Result, Descriptions,
} from "antd";
import {
  LockOutlined, IdcardOutlined, SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import { getClientPortalInviteInfo, acceptClientPortalInvite } from "../../services/ca.service.js";
import AuthSplitLayout from "../../components/auth/AuthSplitLayout.jsx";

const { Title, Text } = Typography;

export default function JoinClientPortal() {
  const { token } = useParams();
  const navigate   = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [form] = Form.useForm();

  const [invite, setInvite]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getClientPortalInviteInfo(token)
      .then((res) => setInvite(res.data))
      .catch((err) => setError(err.response?.data?.error || "This invite link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        pan:      values.pan.toUpperCase(),
        password: values.password,
      };
      const res = await acceptClientPortalInvite(token, payload);
      setToken(res.data.token);
      setUser(res.data.user);
      message.success("Account created — welcome to the portal!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthSplitLayout>
        <div style={{ textAlign: "center" }}>
          <Spin size="large" tip="Loading invite…" />
        </div>
      </AuthSplitLayout>
    );
  }

  if (error && !invite) {
    return (
      <AuthSplitLayout>
        <Result status="error" title="Invite Link Invalid" subTitle={error} />
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout maxWidth={440}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Set Up Your Account</Title>
        <Text type="secondary">
          Invited by {invite.caName || "your CA"}{invite.firmName ? ` (${invite.firmName})` : ""}
        </Text>
      </div>

      <Descriptions column={1} size="small" bordered style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Name">{invite.fullName}</Descriptions.Item>
        <Descriptions.Item label="Email">{invite.email}</Descriptions.Item>
      </Descriptions>

      {error && (
        <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} style={{ marginBottom: 20 }} />
      )}

      <Alert
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        message="Confirm your PAN to verify your identity"
        description={`We have ${invite.pan} on file with your CA. Enter your full PAN to continue.`}
        style={{ marginBottom: 20, borderRadius: 8 }}
      />

      <Form form={form} layout="vertical" onFinish={onFinish} size="large">
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
          Create Account
        </Button>
      </Form>
    </AuthSplitLayout>
  );
}
