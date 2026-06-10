import React from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/index.js";

const { Title } = Typography;

export default function Login() {
  const navigate  = useNavigate();
  const setToken  = useAuthStore((s) => s.setToken);
  const setUser   = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // TODO: wire to auth.service.js once auth module is built
      console.log("Login values:", values);
      message.success("Auth module coming next!");
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-md rounded-xl p-4">
        <Title level={3} className="text-center mb-6">
          ITR Filing — Sign In
        </Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="PAN Number"
            name="pan"
            rules={[
              { required: true, message: "PAN is required" },
              { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: "Invalid PAN format" },
            ]}
          >
            <Input placeholder="ABCDE1234F" maxLength={10} style={{ textTransform: "uppercase" }} />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
