import React, { useState, useEffect } from "react";
import {
  Steps, Card, Button, Form, Input, InputNumber,
  Select, DatePicker, Row, Col, Typography,
  Alert, Divider, Result, Tag, Space, Spin,
} from "antd";
import {
  UserOutlined, BankOutlined, FileTextOutlined,
  CheckCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  TeamOutlined, SendOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { getClient, saveDraftForClient, submitITR1ForClient, sendApproval } from "../../../services/ca.service.js";
import { compareRegimes } from "../../../services/tax.service.js";
import { DEDUCTION_LIMITS, METRO_CITIES } from "@itr-app/shared-types";

const { Title, Text } = Typography;
const { Option }      = Select;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const STEPS = [
  { title: "Personal",   icon: <UserOutlined />,       description: "Client details"   },
  { title: "Income",     icon: <BankOutlined />,        description: "Salary & others"  },
  { title: "Deductions", icon: <FileTextOutlined />,    description: "80C, 80D & more"  },
  { title: "Tax Summary",icon: <CheckCircleOutlined />, description: "Review & submit"  },
];

const STEP_FIELDS = [
  ["fullName","pan","dateOfBirth","gender","residentialStatus","city","employerName","employerTAN","bankAccountNo","ifscCode"],
  ["grossSalary","hra_received","tdsDeducted","interestIncome","otherIncome"],
  ["sec80C","sec80CCD1B","sec80D_self","sec80D_parents","homeLoanInterest","hra_exempt","lta","sec80TTA_TTB","sec80G"],
];

export default function CAITRFiling() {
  const { clientId }   = useParams();
  const navigate       = useNavigate();
  const [form]         = Form.useForm();
  const [current, setCurrent]     = useState(0);
  const [client, setClient]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [taxResult, setTaxResult] = useState(null);
  const [computing, setComputing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError]         = useState(null);
  const [stepData, setStepData]   = useState({});

  useEffect(() => {
    getClient(clientId)
      .then((res) => {
        const c = res.data;
        setClient(c);
        // Pre-fill personal info from client record
        form.setFieldsValue({
          fullName:          c.fullName,
          pan:               c.pan,
          dateOfBirth:       c.dateOfBirth ? dayjs(c.dateOfBirth) : null,
          gender:            c.gender,
          city:              c.city,
          employerName:      c.employerName,
          employerTAN:       c.employerTAN,
          bankAccountNo:     c.bankAccountNo,
          ifscCode:          c.ifscCode,
          residentialStatus: "ROR",
        });
      })
      .catch(() => setError("Failed to load client"))
      .finally(() => setLoading(false));
  }, [clientId]);

  const next = async () => {
    try {
      await form.validateFields(STEP_FIELDS[current]);
      const values = form.getFieldsValue();
      const updated = { ...stepData, [`step${current}`]: values };
      setStepData(updated);

      const draftValues = { ...values };
      if (draftValues.dateOfBirth?.format) draftValues.dateOfBirth = draftValues.dateOfBirth.format("YYYY-MM-DD");

      await saveDraftForClient(clientId, {
        itrType: "ITR-1", assessmentYear: "2026-27", step: current,
        data: { ...updated, [`step${current}`]: draftValues },
      }).catch(() => {});

      if (current === 2) await computeTax(values, updated);
      setCurrent((c) => c + 1);
    } catch (_) {}
  };

  const computeTax = async (deductionValues, allStepData) => {
    setComputing(true);
    setError(null);
    try {
      const s1 = allStepData.step1 || {};
      const payload = {
        grossIncome: s1.grossSalary || 0,
        otherIncome: (s1.interestIncome || 0) + (s1.otherIncome || 0),
        dateOfBirth: (allStepData.step0?.dateOfBirth?.format?.("YYYY-MM-DD")) || client?.dateOfBirth,
        deductions: {
          sec80C:           deductionValues.sec80C           || 0,
          sec80CCD1B:       deductionValues.sec80CCD1B       || 0,
          sec80D_self:      deductionValues.sec80D_self      || 0,
          sec80D_parents:   deductionValues.sec80D_parents   || 0,
          homeLoanInterest: deductionValues.homeLoanInterest || 0,
          hra:              deductionValues.hra_exempt        || 0,
          lta:              deductionValues.lta              || 0,
          sec80TTA_TTB:     deductionValues.sec80TTA_TTB     || 0,
          sec80G:           deductionValues.sec80G           || 0,
        },
      };
      const res = await compareRegimes(payload);
      setTaxResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setComputing(false);
    }
  };

  const handleSubmit = async () => {
    if (!taxResult) return;
    setSubmitting(true);
    try {
      const s0 = stepData.step0 || {};
      const s1 = stepData.step1 || {};
      const s2 = stepData.step2 || {};

      const payload = {
        selectedRegime: taxResult.betterRegime === "equal" ? "new" : taxResult.betterRegime,
        personalInfo: {
          fullName:          s0.fullName || client?.fullName,
          pan:               s0.pan      || client?.pan,
          dateOfBirth:       s0.dateOfBirth?.format?.("YYYY-MM-DD") || null,
          gender:            s0.gender,
          residentialStatus: s0.residentialStatus || "ROR",
          city:              s0.city,
          employerName:      s0.employerName,
          employerTAN:       s0.employerTAN,
          bankAccountNo:     s0.bankAccountNo,
          ifscCode:          s0.ifscCode,
        },
        incomeDetails: {
          grossSalary:    s1.grossSalary    || 0,
          hra_received:   s1.hra_received   || 0,
          tdsDeducted:    s1.tdsDeducted    || 0,
          interestIncome: s1.interestIncome || 0,
          otherIncome:    s1.otherIncome    || 0,
        },
        deductions: {
          sec80C:           s2.sec80C           || 0,
          sec80CCD1B:       s2.sec80CCD1B       || 0,
          sec80D_self:      s2.sec80D_self      || 0,
          sec80D_parents:   s2.sec80D_parents   || 0,
          homeLoanInterest: s2.homeLoanInterest  || 0,
          hra_exempt:       s2.hra_exempt        || 0,
          lta:              s2.lta              || 0,
          sec80TTA_TTB:     s2.sec80TTA_TTB     || 0,
          sec80G:           s2.sec80G           || 0,
        },
      };

      const res = await submitITR1ForClient(clientId, payload);
      setSubmitted(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendApproval = async () => {
    if (!submitted?.filing?._id) return;
    setSubmitting(true);
    try {
      await sendApproval(submitted.filing._id);
      navigate(`/ca/clients/${clientId}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
  if (!client) return <Alert type="error" message="Client not found" />;

  // Success screen
  if (submitted) {
    const { old: o, new: n, betterRegime } = taxResult || {};
    const recommended = betterRegime === "new" ? n : o;
    return (
      <Result
        status="success"
        title={`ITR-1 Prepared for ${client.fullName}`}
        subTitle={
          <div>
            <p>Acknowledgement No: <Text code strong>{submitted.acknowledgementNo}</Text></p>
            <p>Total Tax: <strong style={{ color: "#fa541c" }}>{fmt(submitted.taxSummary?.totalTax)}</strong></p>
            <p>Regime: <Tag color={betterRegime === "new" ? "blue" : "purple"}>{betterRegime === "new" ? "New Regime" : "Old Regime"} (Recommended)</Tag></p>
          </div>
        }
        extra={[
          <Button
            type="primary"
            key="approval"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={handleSendApproval}
          >
            Send for Client Approval
          </Button>,
          <Button key="workspace" onClick={() => navigate(`/ca/clients/${clientId}`)}>
            Back to Client Workspace
          </Button>,
        ]}
      />
    );
  }

  const TaxSummary = () => {
    if (computing) return <div style={{ textAlign: "center", padding: 40 }}><Spin tip="Computing taxes…" /></div>;
    if (!taxResult) return null;
    const { old: o, new: n, betterRegime, savingsAmount } = taxResult;
    const recommended = betterRegime === "new" ? n : o;
    return (
      <>
        <Alert
          message={<Text><Text strong>{betterRegime === "new" ? "New Regime" : "Old Regime"}</Text> saves client <Text strong style={{ color: "#52c41a" }}>{fmt(savingsAmount)}</Text> more.</Text>}
          type="success" showIcon style={{ marginBottom: 20, borderRadius: 8 }}
        />
        <Row gutter={[12, 12]}>
          {[{ label: "Old Regime", data: o }, { label: "New Regime", data: n }].map(({ label, data }) => (
            <Col span={12} key={label}>
              <Card
                variant="borderless" size="small"
                style={{ borderRadius: 10, outline: data === recommended ? "2px solid #1677ff" : "1px solid #f0f0f0" }}
                title={<Space><Text strong>{label}</Text>{data === recommended && <Tag color="blue">Recommended</Tag>}</Space>}
              >
                {[["Gross Income", data.grossIncome], ["Deductions", data.deductionTotal],
                  ["Taxable Income", data.taxableIncome], ["Total Tax", data.totalTax]].map(([lbl, val]) => (
                  <div key={lbl} className="flex justify-between py-1" style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{lbl}</Text>
                    <Text strong style={{ fontSize: 12, color: lbl === "Total Tax" ? "#1677ff" : "inherit" }}>{fmt(val)}</Text>
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
      </>
    );
  };

  const stepContent = [
    // Step 0 — Personal (same fields as ITR1Filing, pre-filled from client)
    <Row gutter={16} key="0">
      <Col xs={24} sm={12}><Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}><Input prefix={<UserOutlined />} /></Form.Item></Col>
      <Col xs={24} sm={12}><Form.Item name="pan" label="PAN" rules={[{ required: true }]}><Input disabled /></Form.Item></Col>
      <Col xs={24} sm={12}><Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
      <Col xs={24} sm={12}><Form.Item name="gender" label="Gender" rules={[{ required: true }]}><Select><Option value="M">Male</Option><Option value="F">Female</Option><Option value="T">Transgender</Option></Select></Form.Item></Col>
      <Col xs={24} sm={12}><Form.Item name="residentialStatus" label="Residential Status" initialValue="ROR" rules={[{ required: true }]}><Select><Option value="ROR">Resident &amp; Ordinarily Resident</Option><Option value="RNOR">RNOR</Option><Option value="NR">Non-Resident</Option></Select></Form.Item></Col>
      <Col xs={24} sm={12}><Form.Item name="city" label="City" rules={[{ required: true }]}><Select showSearch>{[...METRO_CITIES,"Bengaluru","Hyderabad","Pune","Ahmedabad","Other"].map((c) => <Option key={c} value={c}>{c}</Option>)}</Select></Form.Item></Col>
      <Col xs={24}><Form.Item name="employerName" label="Employer Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
      <Col xs={24} sm={12}><Form.Item name="employerTAN" label="Employer TAN" rules={[{ required: true }, { pattern: /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, message: "Invalid TAN" }]}><Input maxLength={10} onChange={(e) => form.setFieldValue("employerTAN", e.target.value.toUpperCase())} /></Form.Item></Col>
      <Col xs={24} sm={12}><Form.Item name="bankAccountNo" label="Bank Account Number" rules={[{ required: true }]}><Input /></Form.Item></Col>
      <Col xs={24} sm={12}><Form.Item name="ifscCode" label="IFSC Code" rules={[{ required: true }, { pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: "Invalid IFSC" }]}><Input maxLength={11} onChange={(e) => form.setFieldValue("ifscCode", e.target.value.toUpperCase())} /></Form.Item></Col>
    </Row>,

    // Step 1 — Income
    <Row gutter={16} key="1">
      {[
        { name: "grossSalary",    label: "Gross Salary (₹)",              required: true },
        { name: "hra_received",   label: "HRA Received (₹)",              required: false },
        { name: "tdsDeducted",    label: "TDS Already Deducted (₹)",      required: true },
        { name: "interestIncome", label: "Interest Income (FD/Savings) (₹)", required: false },
        { name: "otherIncome",    label: "Other Income (₹)",              required: false },
      ].map(({ name, label, required }) => (
        <Col xs={24} sm={12} key={name}>
          <Form.Item name={name} label={label} rules={required ? [{ required: true }] : []}>
            <InputNumber style={{ width: "100%" }} min={0} formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v.replace(/₹\s?|(,*)/g, "")} placeholder="0" />
          </Form.Item>
        </Col>
      ))}
    </Row>,

    // Step 2 — Deductions
    <Row gutter={16} key="2">
      {[
        { name: "sec80C",           label: "80C — PF, PPF, ELSS",      max: DEDUCTION_LIMITS.SEC_80C    },
        { name: "sec80CCD1B",       label: "80CCD(1B) — NPS",           max: DEDUCTION_LIMITS.SEC_80CCD_1B },
        { name: "sec80D_self",      label: "80D — Health Ins. (Self)",   max: DEDUCTION_LIMITS.SEC_80D_SELF },
        { name: "sec80D_parents",   label: "80D — Health Ins. (Parents)",max: DEDUCTION_LIMITS.SEC_80D_PARENTS },
        { name: "homeLoanInterest", label: "24(b) — Home Loan Interest", max: 200000 },
        { name: "hra_exempt",       label: "HRA Exemption",              max: null   },
        { name: "lta",              label: "LTA Exemption",              max: null   },
        { name: "sec80TTA_TTB",     label: "80TTA/TTB — Savings Int.",   max: DEDUCTION_LIMITS.SEC_80TTA },
        { name: "sec80G",           label: "80G — Donations",            max: null   },
      ].map(({ name, label, max }) => (
        <Col xs={24} sm={12} key={name}>
          <Form.Item name={name} label={<span>{label}{max && <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>max {fmt(max)}</Text>}</span>}>
            <InputNumber style={{ width: "100%" }} min={0} max={max || undefined} formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(v) => v.replace(/₹\s?|(,*)/g, "")} placeholder="0" />
          </Form.Item>
        </Col>
      ))}
    </Row>,

    <TaxSummary key="3" />,
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/ca/clients/${clientId}`)}>Back</Button>
        <div>
          <Title level={3} style={{ margin: 0 }}>ITR-1 — {client.fullName}</Title>
          <Space size={4}>
            <Tag icon={<TeamOutlined />} color="purple">CA Filing</Tag>
            <Text code style={{ fontSize: 11 }}>{client.pan}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>FY 2025-26 | AY 2026-27</Text>
          </Space>
        </div>
      </div>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 8 }} closable onClose={() => setError(null)} />}

      <Card variant="borderless" style={{ borderRadius: 10, marginBottom: 24 }}>
        <Steps current={current} items={STEPS} />
      </Card>

      <Card variant="borderless" style={{ borderRadius: 10, marginBottom: 16 }}>
        <Form form={form} layout="vertical" size="large">
          {stepContent[current]}
        </Form>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 10 }}>
        <Row justify="space-between">
          <Col>{current > 0 && <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrent((c) => c - 1)} size="large">Previous</Button>}</Col>
          <Col>
            {current < STEPS.length - 1 ? (
              <Button type="primary" icon={<ArrowRightOutlined />} size="large" onClick={next} loading={computing && current === 2}>
                {current === 2 ? "Compute Tax" : "Next"}
              </Button>
            ) : (
              <Button type="primary" icon={<CheckCircleOutlined />} size="large" loading={submitting} onClick={handleSubmit} disabled={!taxResult}>
                Submit ITR-1 for Client
              </Button>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
}
