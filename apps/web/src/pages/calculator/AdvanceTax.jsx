import React, { useState } from "react";
import {
  Card, Form, InputNumber, Select, Button, Row, Col,
  Typography, Table, Tag, Alert, Statistic, Steps,
  DatePicker, Divider, Timeline, Space,
  theme as antdTheme,
} from "antd";
import {
  CalendarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import { computeAdvanceTax } from "../../services/tax.service.js";
import PageHeader from "../../components/PageHeader.jsx";

const { Title, Text } = Typography;
const { Option }      = Select;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n || 0);

export default function AdvanceTax() {
  const { token } = antdTheme.useToken();
  const [form]    = Form.useForm();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        grossIncome: values.grossIncome,
        otherIncome: values.otherIncome   || 0,
        tdsDeducted: values.tdsDeducted   || 0,
        regime:      values.regime        || "new",
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD") || null,
        deductions:  {},
      };
      const res = await computeAdvanceTax(payload);
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title:     "Installment",
      dataIndex: "quarter",
      key:       "quarter",
      render:    (q, r) => <Text strong>{r.installment}. {q}</Text>,
    },
    {
      title:     "Due Date",
      dataIndex: "dueDate",
      key:       "dueDate",
      render:    (d) => new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      }),
    },
    {
      title:     "Cumulative %",
      dataIndex: "cumulativePercent",
      key:       "pct",
      render:    (p) => <Tag color="blue">{p}%</Tag>,
    },
    {
      title:     "This Installment",
      dataIndex: "installmentAmount",
      key:       "installment",
      render:    (a) => <Text strong style={{ color: "#1677ff" }}>{fmt(a)}</Text>,
    },
    {
      title:     "Cumulative Total",
      dataIndex: "cumulativeAmount",
      key:       "cumulative",
      render:    (a) => fmt(a),
    },
    {
      title:  "Status",
      dataIndex: "status",
      key:    "status",
      render: (s) => (
        <Tag
          color={s === "due" ? "error" : "default"}
          icon={s === "due"
            ? <ExclamationCircleOutlined />
            : <ClockCircleOutlined />}
        >
          {s === "due" ? "Overdue" : "Upcoming"}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <PageHeader icon={<CalendarOutlined />} title="Advance Tax Calculator" subtitle="u/s 207 to 219 of Income Tax Act" period />

      <Alert
        message="Advance tax must be paid if your net tax liability (after TDS) exceeds ₹10,000 in a financial year."
        type="info" showIcon style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Row gutter={[24, 24]}>
        {/* Input */}
        <Col xs={24} lg={9}>
          <Card variant="borderless" style={{ borderRadius: 10 }}
            title="Income Details"
          >
            <Form form={form} layout="vertical" onFinish={onFinish} size="large">
              <Form.Item name="grossIncome" label="Gross Annual Income (₹)"
                rules={[{ required: true, message: "Enter income" }]}
              >
                <InputNumber
                  style={{ width: "100%" }} min={0}
                  formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                  placeholder="e.g. 1500000"
                />
              </Form.Item>

              <Form.Item name="otherIncome" label="Other Income (₹)">
                <InputNumber
                  style={{ width: "100%" }} min={0}
                  formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                  placeholder="0"
                />
              </Form.Item>

              <Form.Item name="tdsDeducted" label="TDS Already Deducted (₹)">
                <InputNumber
                  style={{ width: "100%" }} min={0}
                  formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                  placeholder="0"
                />
              </Form.Item>

              <Form.Item name="regime" label="Tax Regime" initialValue="new">
                <Select>
                  <Option value="new">New Regime (Default)</Option>
                  <Option value="old">Old Regime</Option>
                </Select>
              </Form.Item>

              <Form.Item name="dateOfBirth" label="Date of Birth (for age-based slabs)">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>

              <Button
                type="primary" htmlType="submit"
                loading={loading} block size="large"
                icon={<CalendarOutlined />}
                style={{ borderRadius: 8 }}
              >
                Calculate Advance Tax
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Results */}
        <Col xs={24} lg={15}>
          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
          )}

          {result && (
            <>
              {/* Summary Cards */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                  { title: "Total Tax Liability",  value: result.totalTaxLiability, color: "#1677ff" },
                  { title: "TDS Deducted",         value: result.tdsDeducted,       color: "#faad14" },
                  { title: "Net Advance Tax Due",  value: result.netTaxDue,         color: "#ff4d4f" },
                ].map(({ title, value, color }) => (
                  <Col span={8} key={title}>
                    <Card variant="borderless" style={{ borderRadius: 10, textAlign: "center" }}>
                      <Statistic
                        title={title}
                        value={value}
                        prefix="₹"
                        formatter={(v) => Number(v).toLocaleString("en-IN")}
                        valueStyle={{ color, fontSize: 18 }}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Applicable alert */}
              <Alert
                type={result.applicable ? "warning" : "success"}
                message={result.message}
                showIcon
                style={{ marginBottom: 16, borderRadius: 8 }}
              />

              {result.applicable && (
                <Card
                  variant="borderless"
                  style={{ borderRadius: 10 }}
                  title={
                    <Space>
                      <CalendarOutlined />
                      <span>Installment Schedule — FY 2025-26</span>
                    </Space>
                  }
                >
                  <Table
                    dataSource={result.installments}
                    columns={columns}
                    rowKey="installment"
                    pagination={false}
                    size="middle"
                    onRow={(r) => ({
                      style: r.status === "due" ? { background: token.colorErrorBg } : undefined,
                    })}
                  />

                  <Divider orientation="left">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Interest u/s 234B & 234C applies for default or deferment
                    </Text>
                  </Divider>

                  <Timeline
                    items={result.installments.map((inst) => ({
                      color: inst.status === "due" ? "red" : "blue",
                      dot:   inst.status === "due"
                        ? <ExclamationCircleOutlined style={{ color: "red" }} />
                        : <ClockCircleOutlined style={{ color: "#1677ff" }} />,
                      children: (
                        <div>
                          <Text strong>{inst.quarter} — Due {new Date(inst.dueDate).toLocaleDateString("en-IN")}</Text>
                          <br />
                          <Text type="secondary">Pay {fmt(inst.installmentAmount)} </Text>
                          <Tag color="blue" style={{ marginLeft: 4 }}>
                            Cumulative: {fmt(inst.cumulativeAmount)}
                          </Tag>
                        </div>
                      ),
                    }))}
                  />
                </Card>
              )}
            </>
          )}

          {!result && !loading && (
            <Card variant="borderless" style={{ borderRadius: 10, textAlign: "center", padding: 60 }}>
              <CalendarOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  Enter your estimated annual income and TDS to calculate
                  advance tax installments.
                </Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
