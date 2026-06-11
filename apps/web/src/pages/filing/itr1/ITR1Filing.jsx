import React, { useState } from "react";
import {
  Steps, Card, Button, Form, Input, InputNumber,
  Select, DatePicker, Row, Col, Typography,
  Alert, Divider, Result, Tag, Space,
} from "antd";
import {
  UserOutlined, BankOutlined, FileTextOutlined,
  CheckCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../../store/index.js";
import { useFilingStore } from "../../../store/index.js";
import { compareRegimes } from "../../../services/tax.service.js";
import { DEDUCTION_LIMITS, METRO_CITIES } from "@itr-app/shared-types";

const { Title, Text } = Typography;
const { Option }      = Select;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(n || 0);

const STEPS = [
  { title: "Personal",   icon: <UserOutlined />,     description: "Your details"     },
  { title: "Income",     icon: <BankOutlined />,      description: "Salary & others"  },
  { title: "Deductions", icon: <FileTextOutlined />,  description: "80C, 80D & more"  },
  { title: "Tax Summary",icon: <CheckCircleOutlined />, description: "Review & file"  },
];

export default function ITR1Filing() {
  const { user }   = useAuthStore();
  const { updateFiling, filingData } = useFilingStore();
  const [current, setCurrent] = useState(0);
  const [form]     = Form.useForm();
  const [taxResult, setTaxResult] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const next = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      updateFiling(`step${current}`, values);
      if (current === 2) await computeTaxSummary(values);
      setCurrent((c) => c + 1);
    } catch (_) {}
  };

  const prev = () => setCurrent((c) => c - 1);

  const computeTaxSummary = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const allData = { ...filingData.step0, ...filingData.step1, ...values };
      const payload = {
        grossIncome: allData.basicSalary + allData.hra_received +
                     allData.specialAllowance + (allData.bonus || 0),
        otherIncome: (allData.interestIncome || 0) + (allData.otherIncome || 0),
        dateOfBirth: allData.dateOfBirth?.format("YYYY-MM-DD") || user?.dateOfBirth,
        deductions: {
          sec80C:           allData.sec80C           || 0,
          sec80CCD1B:       allData.sec80CCD1B       || 0,
          sec80D_self:      allData.sec80D_self       || 0,
          sec80D_parents:   allData.sec80D_parents   || 0,
          homeLoanInterest: allData.homeLoanInterest || 0,
          hra:              allData.hra_exempt        || 0,
          lta:              allData.lta              || 0,
          sec80TTA_TTB:     allData.sec80TTA_TTB     || 0,
          sec80G:           allData.sec80G           || 0,
        },
      };
      const res = await compareRegimes(payload);
      setTaxResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 0: Personal Info ──────────────────────────────────
  const PersonalInfo = () => (
    <>
      <Alert
        message="ITR-1 (Sahaj) is for salaried individuals with income up to ₹50 lakhs."
        type="info" showIcon style={{ marginBottom: 24, borderRadius: 8 }}
      />
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="fullName" label="Full Name (as per PAN)"
            rules={[{ required: true }]}
            initialValue={user?.fullName}
          >
            <Input prefix={<UserOutlined />} placeholder="RAJESH KUMAR" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="pan" label="PAN Number"
            rules={[{ required: true }]}
            initialValue={user?.pan}
          >
            <Input placeholder="ABCDE1234F" maxLength={10} disabled />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="dateOfBirth" label="Date of Birth"
            rules={[{ required: true, message: "DOB is required" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="gender" label="Gender"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select gender">
              <Option value="M">Male</Option>
              <Option value="F">Female</Option>
              <Option value="T">Transgender</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="residentialStatus" label="Residential Status"
            rules={[{ required: true }]}
            initialValue="ROR"
          >
            <Select>
              <Option value="ROR">Resident & Ordinarily Resident</Option>
              <Option value="RNOR">Resident but Not Ordinarily Resident</Option>
              <Option value="NR">Non-Resident</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="city" label="City of Employment"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select city" showSearch>
              {[...METRO_CITIES, "Bengaluru", "Hyderabad", "Pune", "Ahmedabad", "Other"]
                .map((c) => <Option key={c} value={c}>{c} {METRO_CITIES.includes(c) ? "🏙 Metro" : ""}</Option>)
              }
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="employerName" label="Employer Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="ABC Pvt Ltd" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="employerTAN" label="Employer TAN"
            rules={[
              { required: true },
              { pattern: /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, message: "Invalid TAN" },
            ]}
          >
            <Input placeholder="ABCD12345E" maxLength={10}
              onChange={(e) => form.setFieldValue("employerTAN", e.target.value.toUpperCase())}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="bankAccountNo" label="Bank Account Number"
            rules={[{ required: true }]}
          >
            <Input placeholder="For refund credit" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="ifscCode" label="IFSC Code"
            rules={[
              { required: true },
              { pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: "Invalid IFSC" },
            ]}
          >
            <Input placeholder="SBIN0001234" maxLength={11}
              onChange={(e) => form.setFieldValue("ifscCode", e.target.value.toUpperCase())}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  // ── Step 1: Income ─────────────────────────────────────────
  const IncomeDetails = () => (
    <>
      <Title level={5}>Salary Income</Title>
      <Row gutter={16}>
        {[
          { name: "basicSalary",       label: "Basic Salary (₹)",        required: true  },
          { name: "hra_received",      label: "HRA Received (₹)",        required: true  },
          { name: "specialAllowance",  label: "Special Allowance (₹)",   required: true  },
          { name: "bonus",             label: "Bonus / Incentives (₹)",  required: false },
          { name: "tdsDeducted",       label: "TDS Already Deducted (₹)", required: true },
        ].map(({ name, label, required }) => (
          <Col xs={24} sm={12} key={name}>
            <Form.Item name={name} label={label}
              rules={required ? [{ required: true, message: `${label} is required` }] : []}
            >
              <InputNumber
                style={{ width: "100%" }} min={0}
                formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                placeholder="0"
              />
            </Form.Item>
          </Col>
        ))}
      </Row>

      <Divider />
      <Title level={5}>Other Income</Title>
      <Row gutter={16}>
        {[
          { name: "interestIncome", label: "Interest Income (FD/Savings) (₹)" },
          { name: "otherIncome",    label: "Any Other Income (₹)"             },
        ].map(({ name, label }) => (
          <Col xs={24} sm={12} key={name}>
            <Form.Item name={name} label={label}>
              <InputNumber
                style={{ width: "100%" }} min={0}
                formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                placeholder="0"
              />
            </Form.Item>
          </Col>
        ))}
      </Row>
    </>
  );

  // ── Step 2: Deductions ─────────────────────────────────────
  const DeductionsForm = () => (
    <>
      <Alert
        message="Deductions below apply only if you choose the Old Tax Regime. The calculator will show which regime saves more."
        type="warning" showIcon style={{ marginBottom: 20, borderRadius: 8 }}
      />
      <Row gutter={16}>
        {[
          { name: "sec80C",           label: "80C — PF, PPF, ELSS, LIC",        max: DEDUCTION_LIMITS.SEC_80C       },
          { name: "sec80CCD1B",       label: "80CCD(1B) — NPS",                 max: DEDUCTION_LIMITS.SEC_80CCD_1B  },
          { name: "sec80D_self",      label: "80D — Health Insurance (Self)",    max: DEDUCTION_LIMITS.SEC_80D_SELF  },
          { name: "sec80D_parents",   label: "80D — Health Insurance (Parents)", max: DEDUCTION_LIMITS.SEC_80D_PARENTS },
          { name: "homeLoanInterest", label: "24(b) — Home Loan Interest",       max: 200000                         },
          { name: "hra_exempt",       label: "HRA Exemption",                    max: null                           },
          { name: "lta",              label: "LTA Exemption",                    max: null                           },
          { name: "sec80TTA_TTB",     label: "80TTA/TTB — Savings Interest",     max: DEDUCTION_LIMITS.SEC_80TTA     },
          { name: "sec80G",           label: "80G — Donations",                  max: null                           },
        ].map(({ name, label, max }) => (
          <Col xs={24} sm={12} key={name}>
            <Form.Item
              name={name}
              label={
                <span>
                  {label}
                  {max && (
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                      max {fmt(max)}
                    </Text>
                  )}
                </span>
              }
            >
              <InputNumber
                style={{ width: "100%" }} min={0} max={max || undefined}
                formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => v.replace(/₹\s?|(,*)/g, "")}
                placeholder="0"
              />
            </Form.Item>
          </Col>
        ))}
      </Row>
    </>
  );

  // ── Step 3: Tax Summary ────────────────────────────────────
  const TaxSummary = () => {
    if (loading) return <div className="text-center py-10"><Text>Computing your taxes...</Text></div>;
    if (error)   return <Alert type="error" message={error} showIcon />;
    if (!taxResult) return null;

    const { old: o, new: n, betterRegime, savingsAmount } = taxResult;
    const recommended = betterRegime === "new" ? n : o;

    return (
      <>
        {/* Regime recommendation */}
        <Alert
          message={
            <Text>
              <Text strong>
                {betterRegime === "new" ? "New Regime" : "Old Regime"}
              </Text>{" "}
              saves you{" "}
              <Text strong style={{ color: "#52c41a" }}>{fmt(savingsAmount)}</Text>{" "}
              more in taxes.
            </Text>
          }
          type="success"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        {/* Side-by-side summary */}
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          {[
            { label: "Old Regime", data: o },
            { label: "New Regime", data: n },
          ].map(({ label, data }) => (
            <Col span={12} key={label}>
              <Card
                bordered={false}
                size="small"
                style={{
                  borderRadius: 10,
                  outline: data === recommended ? "2px solid #1677ff" : "1px solid #f0f0f0",
                }}
                title={
                  <Space>
                    <Text strong>{label}</Text>
                    {data === recommended && <Tag color="blue">Recommended</Tag>}
                  </Space>
                }
              >
                {[
                  ["Gross Income",      data.grossIncome],
                  ["Deductions",        data.deductionTotal],
                  ["Taxable Income",    data.taxableIncome],
                  ["Rebate 87A",        data.rebateApplied],
                  ["Surcharge",         data.surcharge],
                  ["Cess (4%)",         data.cess],
                  ["Total Tax",         data.totalTax],
                ].map(([lbl, val]) => (
                  <div key={lbl}
                    className="flex justify-between py-1"
                    style={{ borderBottom: "1px solid #f5f5f5" }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>{lbl}</Text>
                    <Text strong style={{ fontSize: 12,
                      color: lbl === "Total Tax" ? "#1677ff" : "inherit" }}
                    >
                      {typeof val === "number" ? fmt(val) : val}
                    </Text>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <Text type="secondary" style={{ fontSize: 12 }}>Effective Rate</Text>
                  <Text strong style={{ color: "#52c41a" }}>{data.effectiveRate}%</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Alert
          message="Your ITR-1 draft is ready. Review details and submit to complete e-Filing."
          type="info" showIcon style={{ borderRadius: 8 }}
        />
      </>
    );
  };

  const stepContent = [
    <PersonalInfo key="0" />,
    <IncomeDetails key="1" />,
    <DeductionsForm key="2" />,
    <TaxSummary key="3" />,
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileTextOutlined style={{ fontSize: 28, color: "#1677ff" }} />
        <div>
          <Title level={3} style={{ margin: 0 }}>ITR-1 Filing — Sahaj</Title>
          <Text type="secondary">Salaried individuals | FY 2025-26 | AY 2026-27</Text>
        </div>
      </div>

      {/* Steps indicator */}
      <Card bordered={false} style={{ borderRadius: 10, marginBottom: 24 }}>
        <Steps current={current} items={STEPS} />
      </Card>

      {/* Step content */}
      <Card bordered={false} style={{ borderRadius: 10, marginBottom: 16 }}>
        <Form form={form} layout="vertical" size="large">
          {stepContent[current]}
        </Form>
      </Card>

      {/* Navigation */}
      <Card bordered={false} style={{ borderRadius: 10 }}>
        <Row justify="space-between">
          <Col>
            {current > 0 && (
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={prev}
                size="large"
              >
                Previous
              </Button>
            )}
          </Col>
          <Col>
            {current < STEPS.length - 1 ? (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={next}
                size="large"
                loading={loading && current === 2}
              >
                {current === 2 ? "Compute Tax" : "Next"}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="large"
                onClick={() => alert("e-Filing integration coming soon!")}
              >
                Submit ITR-1
              </Button>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
}
