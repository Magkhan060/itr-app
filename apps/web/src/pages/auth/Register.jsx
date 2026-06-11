import React, { useState } from "react";
import {
  Form, Input, Button, Card, Typography,
  DatePicker, Steps, message, Alert, Divider, Row, Col,
} from "antd";
import {
  UserOutlined, LockOutlined, MailOutlined,
  PhoneOutlined, FileDoneOutlined, IdcardOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";
import { register } from "../../services/auth.service.js";

const { Title, Text } = Typography;

export default function Register() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading]  = useState(false);
  const [apiError, setApiError] = useState(null);
  const [form] = Form.useForm();

  const steps = [
    { title: "Identity",  description: "PAN & Name" },
    { title: "Contact",   description: "Email & Mobile" },
    { title: "Security",  description: "Set Password" },
  ];

  const next = async () => {
    try {
      const fields = [
        ["pan", "fullName", "dateOfBirth"],
        ["email", "mobile"],
        ["password", "confirmPassword"],
      ][current];
      await form.validateFields(fields);
      setCurrent((c) => c + 1);
    } catch (_) {}
  };

  const onFinish = async (values) => {
    setLoading(true);
    setApiError(null);
    try {
      const payload = {
        pan:         values.pan.toUpperCase(),
        fullName:    values.fullName,
        email:       values.email,
        mobile:      values.mobile,
        password:    values.password,
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
      };
      const res = await register(payload);
      setToken(res.data.token);
      setUser(res.data.user);
      message.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      setApiError(err.message);
      setCurrent(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ minHeight: "100vh", background: "#f0f2f5" }}
      className="flex items-center justify-center py-8"
    >
      <Card
        style={{ width: 520, borderRadius: 12 }}
        styles={{ body: { padding: "40px" } }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <FileDoneOutlined style={{ fontSize: 36, color: "#1677ff" }} />
          <Title level={3} style={{ marginTop: 10, marginBottom: 4 }}>
            Create Your Account
          </Title>
          <Text type="secondary">ITR Filing Portal — FY 2025-26</Text>
        </div>

        {/* Stepper */}
        <Steps
          current={current}
          items={steps}
          size="small"
          style={{ marginBottom: 32 }}
        />

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
          {/* Step 1 — Identity */}
          <div style={{ display: current === 0 ? "block" : "none" }}>
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
                prefix={<IdcardOutlined />}
                placeholder="ABCDE1234F"
                maxLength={10}
                onChange={(e) =>
                  form.setFieldValue("pan", e.target.value.toUpperCase())
                }
              />
            </Form.Item>

            <Form.Item
              name="fullName"
              label="Full Name (as per PAN)"
              rules={[
                { required: true, message: "Full name is required" },
                { min: 3, message: "At least 3 characters" },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="RAJESH KUMAR" />
            </Form.Item>

            <Form.Item name="dateOfBirth" label="Date of Birth">
              <DatePicker
                style={{ width: "100%" }}
                placeholder="Select date of birth"
                format="DD/MM/YYYY"
                disabledDate={(d) => d && d.isAfter(new Date())}
              />
            </Form.Item>
          </div>

          {/* Step 2 — Contact */}
          <div style={{ display: current === 1 ? "block" : "none" }}>
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Invalid email" },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" />
            </Form.Item>

            <Form.Item
              name="mobile"
              label="Mobile Number"
              rules={[
                { required: true, message: "Mobile is required" },
                {
                  pattern: /^[6-9]\d{9}$/,
                  message: "Invalid Indian mobile number",
                },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                addonBefore="+91"
                placeholder="9876543210"
                maxLength={10}
              />
            </Form.Item>
          </div>

          {/* Step 3 — Password */}
          <div style={{ display: current === 2 ? "block" : "none" }}>
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Password is required" },
                { min: 8,         message: "At least 8 characters" },
                {
                  pattern: /[A-Z]/,
                  message: "Must contain an uppercase letter",
                },
                { pattern: /[0-9]/, message: "Must contain a number" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value)
                      return Promise.resolve();
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Re-enter password"
              />
            </Form.Item>
          </div>

          {/* Navigation buttons */}
          <Row gutter={12} style={{ marginTop: 8 }}>
            {current > 0 && (
              <Col span={12}>
                <Button block size="large" onClick={() => setCurrent((c) => c - 1)}>
                  Back
                </Button>
              </Col>
            )}
            <Col span={current > 0 ? 12 : 24}>
              {current < steps.length - 1 ? (
                <Button type="primary" block size="large" onClick={next}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                >
                  Create Account
                </Button>
              )}
            </Col>
          </Row>
        </Form>

        <Divider plain>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Already have an account?
          </Text>
        </Divider>
        <Button block onClick={() => navigate("/login")}>
          Sign In Instead
        </Button>
      </Card>
    </div>
  );
}
