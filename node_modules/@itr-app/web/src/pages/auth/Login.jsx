import React, { useState } from "react";
import {
  Form, Input, Button, Card, Typography,
  message, Divider, Alert,
} from "antd";
import {
  UserOutlined, LockOutlined, FileDoneOutlined,
} from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import { login } from "../../services/auth.service.js";

const { Title, Text } = Typography;

export default function Login() {
  const navigate  = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await login({
        ...values,
        pan: values.pan.toUpperCase(),
      });
      setToken(res.data.token);
      setUser(res.data.user);
      message.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ minHeight: "100vh", background: "#f0f2f5" }}
      className="flex items-center justify-center"
    >
      <Card
        style={{ width: 420, borderRadius: 12 }}
        styles={{ body: { padding: "40px 40px 24px" } }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <FileDoneOutlined style={{ fontSize: 40, color: "#1677ff" }} />
          <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
            ITR Filing Portal
          </Title>
          <Text type="secondary">FY 2025-26 | AY 2026-27</Text>
        </div>

        {apiError && (
          <Alert
            message={apiError}
            type="error"
            showIcon
            closable
            onClose={() => setApiError(null)}
            style={{ marginBottom: 20 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="pan"
            label="PAN Number"
            rules={[
              { required: true, message: "PAN is required" },
              {
                pattern: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/,
                message: "Invalid PAN (e.g. ABCDE1234F)",
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="ABCDE1234F"
              maxLength={10}
              style={{ textTransform: "uppercase" }}
              onChange={(e) =>
                form.setFieldValue("pan", e.target.value.toUpperCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 44, borderRadius: 8 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary" style={{ fontSize: 12 }}>
            New to ITR Filing?
          </Text>
        </Divider>

        <Button
          block
          style={{ borderRadius: 8 }}
          onClick={() => navigate("/register")}
        >
          Create Account
        </Button>
      </Card>
    </div>
  );
}
