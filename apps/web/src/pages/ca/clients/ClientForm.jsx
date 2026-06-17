import React, { useState, useEffect } from "react";
import {
  Form, Input, Select, DatePicker, Button,
  Row, Col, Typography, Alert, Space, Spin,
} from "antd";
import {
  UserOutlined, IdcardOutlined, MailOutlined,
  PhoneOutlined, BankOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { createClient, updateClient, getClient } from "../../../services/ca.service.js";
import { METRO_CITIES, isValidAadhaarChecksum } from "@itr-app/shared-types";

const { Title } = Typography;
const { Option } = Select;

/**
 * Reusable client create/edit form — embeddable in a routed page (AddEditClient.jsx)
 * or a Drawer (CADashboard.jsx). Caller controls navigation/closing via onSuccess/onCancel.
 */
export default function ClientForm({ clientId, onSuccess, onCancel }) {
  const isEdit = !!clientId;
  const [form] = Form.useForm();

  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!isEdit) {
      form.resetFields();
      setFetching(false);
      return;
    }
    setFetching(true);
    getClient(clientId)
      .then((res) => {
        const d = res.data;
        form.setFieldsValue({
          ...d,
          dateOfBirth: d.dateOfBirth ? dayjs(d.dateOfBirth) : null,
        });
      })
      .catch(() => setError("Failed to load client data"))
      .finally(() => setFetching(false));
  }, [clientId]);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...values,
        pan:         values.pan?.toUpperCase(),
        employerTAN: values.employerTAN?.toUpperCase(),
        ifscCode:    values.ifscCode?.toUpperCase(),
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
      };
      const res = isEdit
        ? await updateClient(clientId, payload)
        : await createClient(payload);
      onSuccess?.(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 20, borderRadius: 8 }} closable onClose={() => setError(null)} />}

      <Spin spinning={fetching}>
        <Form form={form} layout="vertical" size="large" onFinish={onFinish}>
          <Title level={5}>Identity</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="fullName"
                label="Full Name (as per PAN)"
                rules={[{ required: true, message: "Name is required" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="RAJESH KUMAR" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="pan"
                label="PAN Number"
                rules={[
                  { required: true, message: "PAN is required" },
                  { pattern: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, message: "Invalid PAN" },
                ]}
              >
                <Input
                  prefix={<IdcardOutlined />}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  onChange={(e) => form.setFieldValue("pan", e.target.value.toUpperCase())}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabledDate={(d) => d?.isAfter(new Date())} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="gender" label="Gender">
                <Select placeholder="Select gender">
                  <Option value="M">Male</Option>
                  <Option value="F">Female</Option>
                  <Option value="T">Transgender</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="fatherName" label="Father's Name">
                <Input prefix={<UserOutlined />} placeholder="FATHER'S FULL NAME" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="aadhaar"
                label="Aadhaar Number"
                rules={[
                  { pattern: /^\d{12}$/, message: "Aadhaar must be 12 digits" },
                  {
                    validator: (_, value) =>
                      !value || isValidAadhaarChecksum(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error("Invalid Aadhaar number — please re-check the digits")),
                  },
                ]}
              >
                <Input
                  prefix={<IdcardOutlined />}
                  placeholder="1234 5678 9012"
                  maxLength={12}
                />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 8 }}>Contact</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label="Email Address" rules={[{ type: "email", message: "Invalid email" }]}>
                <Input prefix={<MailOutlined />} placeholder="client@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="mobile"
                label="Mobile Number"
                rules={[{ pattern: /^[6-9]\d{9}$/, message: "Invalid Indian mobile" }]}
              >
                <Input prefix={<PhoneOutlined />} addonBefore="+91" placeholder="9876543210" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 8 }}>Address</Title>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="addressLine1" label="Street / Flat / Colony">
                <Input placeholder="19-4-438/A/10, Street 3, BNK Colony" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="city" label="City">
                <Select placeholder="Select city" showSearch>
                  {[...METRO_CITIES, "Bengaluru", "Hyderabad", "Pune", "Ahmedabad", "Other"]
                    .map((c) => <Option key={c} value={c}>{c}{METRO_CITIES.includes(c) ? " 🏙" : ""}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="pinCode"
                label="PIN Code"
                rules={[{ pattern: /^\d{6}$/, message: "PIN must be 6 digits" }]}
              >
                <Input placeholder="500064" maxLength={6} />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 8 }}>Employment & Banking</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="employerName" label="Employer Name">
                <Input placeholder="ABC Pvt Ltd" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="employerTAN"
                label="Employer TAN"
                rules={[{ pattern: /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, message: "Invalid TAN" }]}
              >
                <Input
                  placeholder="ABCD12345E"
                  maxLength={10}
                  onChange={(e) => form.setFieldValue("employerTAN", e.target.value.toUpperCase())}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="bankAccountNo" label="Bank Account Number">
                <Input prefix={<BankOutlined />} placeholder="For refund credit" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="ifscCode"
                label="IFSC Code"
                rules={[{ pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: "Invalid IFSC" }]}
              >
                <Input
                  placeholder="SBIN0001234"
                  maxLength={11}
                  onChange={(e) => form.setFieldValue("ifscCode", e.target.value.toUpperCase())}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Internal Notes (visible only to you)">
            <Input.TextArea rows={2} placeholder="Any notes about this client…" />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" size="large" loading={loading}>
              {isEdit ? "Save Changes" : "Add Client"}
            </Button>
            {onCancel && <Button size="large" onClick={onCancel}>Cancel</Button>}
          </Space>
        </Form>
      </Spin>
    </>
  );
}
