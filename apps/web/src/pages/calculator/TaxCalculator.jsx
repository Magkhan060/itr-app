import React, { useState } from "react";
import {
  Card, Form, InputNumber, Select, Button, Row, Col,
  Typography, Divider, Table, Tag, Alert, Statistic,
  Collapse, DatePicker, Spin, Steps, Result,
} from "antd";
import {
  CalculatorOutlined, ArrowRightOutlined,
  CheckCircleOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { compareRegimes } from "../../services/tax.service.js";
import { DEDUCTION_LIMITS } from "@itr-app/shared-types";
import { useAuthStore } from "../../store/index.js";

const { Title, Text } = Typography;
const { Panel }       = Collapse;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(n || 0);

const pct = (n) => `${n}%`;

export default function TaxCalculator() {
  const { user }         = useAuthStore();
  const [form]           = Form.useForm();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        grossIncome: values.grossIncome,
        otherIncome: values.otherIncome || 0,
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD") || null,
        deductions: {
          sec80C:           values.sec80C           || 0,
          sec80CCD1B:       values.sec80CCD1B       || 0,
          sec80D_self:      values.sec80D_self       || 0,
          sec80D_parents:   values.sec80D_parents   || 0,
          sec80G:           values.sec80G           || 0,
          sec80TTA_TTB:     values.sec80TTA_TTB     || 0,
          homeLoanInterest: values.homeLoanInterest || 0,
          hra:              values.hra              || 0,
          lta:              values.lta              || 0,
          otherDeductions:  values.otherDeductions  || 0,
        },
      };
      const res = await compareRegimes(payload);
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const comparisonColumns = [
    {
      title:     "Component",
      dataIndex: "label",
      key:       "label",
      render:    (text) => <Text strong>{text}</Text>,
    },
    {
      title:     "Old Regime",
      dataIndex: "old",
      key:       "old",
      align:     "right",
      render:    (val) => (<Text>{typeof val === "string" ? val : fmt(val)}</Text>),
    },
    {
      title:     "New Regime",
      dataIndex: "new",
      key:       "new",
      align:     "right",
      render:    (val) => (<Text>{typeof val === "string" ? val : fmt(val)}</Text>),
    },
  ];

  const buildTableData = (r) => [
    { key: "1", label: "Gross Income",       old: r.old.grossIncome,       new: r.new.grossIncome       },
    { key: "2", label: "Total Deductions",   old: r.old.deductionTotal,    new: r.new.deductionTotal    },
    { key: "3", label: "Taxable Income",     old: r.old.taxableIncome,     new: r.new.taxableIncome     },
    { key: "4", label: "Tax (before rebate)", old: r.old.taxBeforeRebate,  new: r.new.taxBeforeRebate   },
    { key: "5", label: "Rebate u/s 87A",     old: r.old.rebateApplied,     new: r.new.rebateApplied     },
    { key: "6", label: "Surcharge",          old: r.old.surcharge,         new: r.new.surcharge         },
    { key: "7", label: "Health & Ed. Cess",  old: r.old.cess,              new: r.new.cess              },
    { key: "8", label: "Total Tax Payable",  old: r.old.totalTax,          new: r.new.totalTax          },
    { key: "9", label: "Effective Rate",
      old: pct(r.old.effectiveRate),
      new: pct(r.new.effectiveRate),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CalculatorOutlined style={{ fontSize: 28, color: "#1677ff" }} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Tax Calculator</Title>
          <Text type="secondary">FY 2025-26 | AY 2026-27 — Old vs New Regime</Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* ── Input Form ─────────────────────────────── */}
        <Col xs={24} lg={10}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ grossIncome: 0, otherIncome: 0 }}
          >
            <Card
              title="Income Details"
              bordered={false}
              style={{ borderRadius: 10, marginBottom: 16 }}
            >
              <Form.Item
                name="grossIncome"
                label="Gross Annual Income (₹)"
                rules={[{ required: true, message: "Enter gross income" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  max={100000000}
                  step={10000}
                  formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                  placeholder="e.g. 1200000"
                />
              </Form.Item>

              <Form.Item name="otherIncome" label="Other Income (₹)">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                  placeholder="Interest, rent, etc."
                />
              </Form.Item>

              <Form.Item name="dateOfBirth" label="Date of Birth (for age-based slabs)">
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Select DOB"
                />
              </Form.Item>
            </Card>

            {/* Deductions (old regime) */}
            <Collapse
              bordered={false}
              style={{ borderRadius: 10, marginBottom: 16, background: "#fff" }}
            >
              <Panel
                header={
                  <Text strong>
                    Deductions <Text type="secondary">(applicable for Old Regime)</Text>
                  </Text>
                }
                key="1"
              >
                {[
                  { name: "sec80C",           label: `80C — PF, ELSS, LIC`,         max: DEDUCTION_LIMITS.SEC_80C       },
                  { name: "sec80CCD1B",        label: `80CCD(1B) — NPS`,             max: DEDUCTION_LIMITS.SEC_80CCD_1B  },
                  { name: "sec80D_self",       label: `80D — Health Ins. (Self)`,    max: DEDUCTION_LIMITS.SEC_80D_SELF  },
                  { name: "sec80D_parents",    label: `80D — Health Ins. (Parents)`, max: DEDUCTION_LIMITS.SEC_80D_PARENTS },
                  { name: "homeLoanInterest",  label: `24(b) — Home Loan Interest`,  max: 200000                         },
                  { name: "hra",               label: `HRA Exemption`,               max: null                           },
                  { name: "lta",               label: `LTA Exemption`,               max: null                           },
                  { name: "sec80TTA_TTB",      label: `80TTA/TTB — Savings Interest`, max: DEDUCTION_LIMITS.SEC_80TTA   },
                  { name: "sec80G",            label: `80G — Donations`,             max: null                           },
                  { name: "otherDeductions",   label: `Other Deductions`,            max: null                           },
                ].map(({ name, label, max }) => (
                  <Form.Item
                    key={name}
                    name={name}
                    label={
                      <span>
                        {label}
                        {max && (
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                            (max {fmt(max)})
                          </Text>
                        )}
                      </span>
                    }
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      max={max || 10000000}
                      formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                      placeholder="0"
                    />
                  </Form.Item>
                ))}
              </Panel>
            </Collapse>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              icon={<CalculatorOutlined />}
              style={{ borderRadius: 8 }}
            >
              Compare Regimes
            </Button>
          </Form>
        </Col>

        {/* ── Results ────────────────────────────────── */}
        <Col xs={24} lg={14}>
          {loading && (
            <Card bordered={false} style={{ borderRadius: 10, textAlign: "center", padding: 40 }}>
              <Spin size="large" tip="Computing tax..." />
            </Card>
          )}

          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
          )}

          {result && !loading && (
            <>
              {/* Winner Banner */}
              <Card
                bordered={false}
                style={{
                  borderRadius: 10,
                  marginBottom: 16,
                  background: result.betterRegime === "new" ? "#f6ffed" : "#fff7e6",
                  borderLeft: `4px solid ${result.betterRegime === "new" ? "#52c41a" : "#faad14"}`,
                }}
              >
                <Row align="middle" justify="space-between">
                  <Col>
                    <Text type="secondary">Recommended Regime</Text>
                    <div>
                      <Tag
                        color={result.betterRegime === "new" ? "success" : "warning"}
                        style={{ fontSize: 16, padding: "4px 12px", marginTop: 4 }}
                      >
                        {result.betterRegime === "new" ? "New Regime" : "Old Regime"}
                      </Tag>
                    </div>
                  </Col>
                  <Col>
                    <Statistic
                      title="You Save"
                      value={result.savingsAmount}
                      prefix="₹"
                      formatter={(v) =>
                        Number(v).toLocaleString("en-IN")
                      }
                      valueStyle={{
                        color: result.betterRegime === "new" ? "#52c41a" : "#faad14",
                        fontSize: 24,
                      }}
                    />
                  </Col>
                </Row>
              </Card>

              {/* Tax Summary Cards */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {["old", "new"].map((regime) => (
                  <Col span={12} key={regime}>
                    <Card
                      bordered={false}
                      style={{
                        borderRadius: 10,
                        outline: result.betterRegime === regime
                          ? "2px solid #1677ff"
                          : "none",
                      }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <Text strong style={{ textTransform: "capitalize" }}>
                          {regime} Regime
                        </Text>
                        {result.betterRegime === regime && (
                          <CheckCircleOutlined style={{ color: "#1677ff" }} />
                        )}
                      </div>
                      <Statistic
                        title="Total Tax Payable"
                        value={result[regime].totalTax}
                        prefix="₹"
                        formatter={(v) => Number(v).toLocaleString("en-IN")}
                        valueStyle={{ fontSize: 20 }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Effective rate: {result[regime].effectiveRate}%
                      </Text>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Detailed Comparison Table */}
              <Card
                title="Detailed Breakdown"
                bordered={false}
                style={{ borderRadius: 10 }}
              >
                <Table
                  dataSource={buildTableData(result)}
                  columns={comparisonColumns}
                  pagination={false}
                  size="small"
                  rowClassName={(_, i) => i === 7 ? "font-bold bg-blue-50" : ""}
                />
              </Card>
            </>
          )}

          {!result && !loading && !error && (
            <Card
              bordered={false}
              style={{ borderRadius: 10, textAlign: "center", padding: 60 }}
            >
              <CalculatorOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  Enter your income details and click "Compare Regimes"
                  to see your tax liability under both regimes.
                </Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
