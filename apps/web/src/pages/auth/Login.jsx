import React, { useState } from "react";
import {
  Form, Input, Button, Typography, message, Alert, Divider,
} from "antd";
import {
  UserOutlined, LockOutlined, FileDoneOutlined,
  SafetyCertificateOutlined, CloudServerOutlined, AuditOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import { login } from "../../services/auth.service.js";

const { Title, Text } = Typography;

const FEATURES = [
  { icon: <AuditOutlined />,            text: "File your ITR-1 online — built for CAs and individuals" },
  { icon: <SafetyCertificateOutlined />, text: "PAN & Aadhaar encrypted at rest (AES-256)"  },
  { icon: <CloudServerOutlined />,       text: "Form 16 upload, parsed and pre-filled"      },
  { icon: <FileDoneOutlined />,          text: "Old vs New regime instant comparison"        },
];

export default function Login() {
  const navigate  = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState(null);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await login({ ...values, pan: values.pan.toUpperCase() });
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
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* ── Left branded panel ───────────────────────── */}
      <div
        style={{
          flex: "0 0 45%",
          background: "linear-gradient(135deg, #1677ff 0%, #003eb3 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 56px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
        className="hidden lg:flex"
      >
        {/* Decorative glow — adds depth without needing an image asset */}
        <div
          style={{
            position: "absolute", top: -120, right: -120, zIndex: 0,
            width: 360, height: 360, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: -160, left: -100, zIndex: 0,
            width: 320, height: 320, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
          }}
        />

        <div style={{ marginBottom: 48, position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <FileDoneOutlined style={{ fontSize: 28, color: "#fff" }} />
          </div>
          <Title level={2} style={{ color: "#fff", marginTop: 0, marginBottom: 4 }}>
            ITR Filing Portal
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>
            Secure, simple Indian tax filing — FY 2025-26
          </Text>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48, position: "relative", zIndex: 1 }}>
          {FEATURES.map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 15 }}>{text}</Text>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Assessment Year</Text>
          <div>
            <Text strong style={{ color: "#fff", fontSize: 18 }}>AY 2026-27</Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginLeft: 10 }}>
              FY 2025-26
            </Text>
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <FileDoneOutlined style={{ fontSize: 36, color: "#1677ff" }} />
            <Title level={3} style={{ marginTop: 10, marginBottom: 2 }}>ITR Filing Portal</Title>
            <Text type="secondary">FY 2025-26 | AY 2026-27</Text>
          </div>

          <div style={{ marginBottom: 32 }}>
            <Title level={3} style={{ margin: 0 }}>Sign in</Title>
            <Text type="secondary">Enter your PAN and password to continue</Text>
          </div>

          {apiError && (
            <Alert
              message={apiError}
              type="error"
              showIcon
              closable
              onClose={() => setApiError(null)}
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )}

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
                prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="ABCDE1234F"
                maxLength={10}
                style={{ borderRadius: 8 }}
                onChange={(e) => form.setFieldValue("pan", e.target.value.toUpperCase())}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Enter your password"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 46, borderRadius: 8, fontSize: 15 }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>
            <Text type="secondary" style={{ fontSize: 12 }}>New to ITR Filing?</Text>
          </Divider>

          <Button
            block
            size="large"
            style={{ borderRadius: 8 }}
            onClick={() => navigate("/register")}
          >
            Create Account
          </Button>

          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              AES-256 encrypted · Compliant with IT Act 2000
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
