import React, { useState, useEffect } from "react";
import {
  Steps, Card, Button, Form, Input, InputNumber,
  Select, DatePicker, Row, Col, Typography,
  Alert, Result, Tag, Space, Spin, Radio,
  theme as antdTheme,
} from "antd";
import {
  UserOutlined, BankOutlined, FileTextOutlined,
  CheckCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  TeamOutlined, SendOutlined, HomeOutlined, PlusOutlined,
  DeleteOutlined, RiseOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useAuthStore } from "../../../store/index.js";
import { getClient, saveDraftITR2ForClient, submitITR2ForClient, sendApproval } from "../../../services/ca.service.js";
import { compareRegimesWithCG } from "../../../services/tax.service.js";
import { DEDUCTION_LIMITS, METRO_CITIES, CAPITAL_GAINS } from "@itr-app/shared-types";
import PageHeader from "../../../components/PageHeader.jsx";

const { Title, Text } = Typography;
const { Option }      = Select;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const numberFieldProps = {
  style: { width: "100%" }, min: 0,
  formatter: (v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  parser: (v) => v.replace(/₹\s?|(,*)/g, ""),
  placeholder: "0",
};

const STEPS = [
  { title: "Personal",   icon: <UserOutlined />,        description: "Client details"   },
  { title: "Income",     icon: <BankOutlined />,         description: "Salary & others"  },
  { title: "Property & CG", icon: <HomeOutlined />,       description: "House property, capital gains" },
  { title: "Deductions", icon: <FileTextOutlined />,     description: "80C, 80D & more"  },
  { title: "Tax Summary",icon: <CheckCircleOutlined />, description: "Review & submit"  },
];

const STEP_FIELDS = [
  ["fullName","pan","dateOfBirth","gender","residentialStatus","city","employerName","employerTAN","bankAccountNo","ifscCode"],
  ["basicSalary","hra_received","specialAllowance","bonus","tdsDeducted","interestIncome","otherIncome"],
  ["houseProperties","stcg111A","ltcg112A"],
  ["sec80C","sec80CCD1B","sec80D_self","sec80D_parents","hra_exempt","lta","sec80TTA_TTB","sec80G"],
];

// Mirrors computeHousePropertyBreakdown in filing.service.js — self-occupied
// interest is kept separate (only deductible old regime, capped 2L) rather
// than blended into otherIncome, so the old/new comparison stays fair.
const splitHouseProperty = (houseProperties = []) => {
  let selfOccupiedInterest = 0;
  let letOutNetIncome = 0;
  for (const p of houseProperties) {
    if (p.type === "self_occupied") {
      selfOccupiedInterest += p.interestOnLoan || 0;
    } else {
      const nav = Math.max(0, (p.annualRent || 0) - (p.municipalTax || 0));
      letOutNetIncome += nav - nav * 0.30 - (p.interestOnLoan || 0);
    }
  }
  return { letOutNetIncome, selfOccupiedInterest };
};

export default function CAITR2Filing() {
  const { token }      = antdTheme.useToken();
  const { clientId }   = useParams();
  const navigate        = useNavigate();
  const { user }       = useAuthStore();
  const isAdmin         = user?.role === "ca_admin";
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
      const values = form.getFieldsValue(true);
      const updated = { ...stepData, [`step${current}`]: values };
      setStepData(updated);

      const draftValues = { ...values };
      if (draftValues.dateOfBirth?.format) draftValues.dateOfBirth = draftValues.dateOfBirth.format("YYYY-MM-DD");

      await saveDraftITR2ForClient(clientId, {
        itrType: "ITR-2", assessmentYear: "2026-27", step: current,
        data: { ...updated, [`step${current}`]: draftValues },
      }).catch(() => {});

      if (current === 3) await computeTax(values, updated);
      setCurrent((c) => c + 1);
    } catch (_) {}
  };

  const computeTax = async (deductionValues, allStepData) => {
    setComputing(true);
    setError(null);
    try {
      const s1 = allStepData.step1 || {};
      const s2 = allStepData.step2 || {};
      const grossIncome =
        (s1.basicSalary      || 0) +
        (s1.hra_received     || 0) +
        (s1.specialAllowance || 0) +
        (s1.bonus            || 0);
      const { letOutNetIncome, selfOccupiedInterest } = splitHouseProperty(s2.houseProperties || []);

      const payload = {
        grossIncome,
        otherIncome: (s1.interestIncome || 0) + (s1.otherIncome || 0) + letOutNetIncome,
        capitalGains: {
          stcg111A: s2.stcg111A || 0,
          ltcg112A: s2.ltcg112A || 0,
        },
        dateOfBirth: (allStepData.step0?.dateOfBirth?.format?.("YYYY-MM-DD")) || client?.dateOfBirth,
        deductions: {
          sec80C:           deductionValues.sec80C           || 0,
          sec80CCD1B:       deductionValues.sec80CCD1B       || 0,
          sec80D_self:      deductionValues.sec80D_self      || 0,
          sec80D_parents:   deductionValues.sec80D_parents   || 0,
          homeLoanInterest: selfOccupiedInterest,
          hra:              deductionValues.hra_exempt        || 0,
          lta:              deductionValues.lta              || 0,
          sec80TTA_TTB:     deductionValues.sec80TTA_TTB     || 0,
          sec80G:           deductionValues.sec80G           || 0,
        },
      };
      const res = await compareRegimesWithCG(payload);
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
      const s3 = stepData.step3 || {};

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
          basicSalary:      s1.basicSalary      || 0,
          hra_received:     s1.hra_received     || 0,
          specialAllowance: s1.specialAllowance || 0,
          bonus:            s1.bonus            || 0,
          tdsDeducted:      s1.tdsDeducted      || 0,
          interestIncome:   s1.interestIncome   || 0,
          otherIncome:      s1.otherIncome      || 0,
        },
        houseProperties: (s2.houseProperties || []).map((p) => ({
          type:           p.type,
          address:        p.address || "",
          annualRent:     p.annualRent     || 0,
          municipalTax:   p.municipalTax   || 0,
          interestOnLoan: p.interestOnLoan || 0,
        })),
        capitalGains: {
          stcg111A: s2.stcg111A || 0,
          ltcg112A: s2.ltcg112A || 0,
        },
        deductions: {
          sec80C:         s3.sec80C         || 0,
          sec80CCD1B:     s3.sec80CCD1B     || 0,
          sec80D_self:    s3.sec80D_self    || 0,
          sec80D_parents: s3.sec80D_parents || 0,
          hra_exempt:     s3.hra_exempt     || 0,
          lta:            s3.lta            || 0,
          sec80TTA_TTB:   s3.sec80TTA_TTB   || 0,
          sec80G:         s3.sec80G         || 0,
        },
      };

      const res = await submitITR2ForClient(clientId, payload);
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
    const { betterRegime } = taxResult || {};
    return (
      <Result
        status="success"
        title={`ITR-2 Prepared for ${client.fullName}`}
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
                style={{ borderRadius: 10, outline: data === recommended ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}` }}
                title={<Space><Text strong>{label}</Text>{data === recommended && <Tag color="blue">Recommended</Tag>}</Space>}
              >
                {[["Slab Income (Salary + Others)", data.slabTaxableIncome], ["Slab Tax (after rebate)", data.slabTaxPostRebate],
                  ["STCG (Sec 111A) Tax", data.capitalGains?.stcgTax], ["LTCG (Sec 112A) Tax", data.capitalGains?.ltcgTax],
                  ["Surcharge", data.surcharge], ["Cess (4%)", data.cess], ["Total Tax", data.totalTax]].map(([lbl, val]) => (
                  <div key={lbl} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{lbl}</Text>
                    <Text strong style={{ fontSize: 12, color: lbl === "Total Tax" ? token.colorPrimary : "inherit" }}>
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
      </>
    );
  };

  const stepContent = [
    // Step 0 — Personal (pre-filled from client)
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
        { name: "basicSalary",      label: "Basic Salary (₹)",              required: true },
        { name: "hra_received",     label: "HRA Received (₹)",              required: false },
        { name: "specialAllowance", label: "Special Allowance (₹)",         required: false },
        { name: "bonus",            label: "Bonus (₹)",                     required: false },
      ].map(({ name, label, required }) => (
        <Col xs={24} sm={12} key={name}>
          <Form.Item name={name} label={label} rules={required ? [{ required: true }] : []}>
            <InputNumber {...numberFieldProps} />
          </Form.Item>
        </Col>
      ))}
      <Col xs={24}>
        <Form.Item shouldUpdate noStyle>
          {() => {
            const v = form.getFieldsValue(["basicSalary", "hra_received", "specialAllowance", "bonus"]);
            const total = (v.basicSalary || 0) + (v.hra_received || 0) + (v.specialAllowance || 0) + (v.bonus || 0);
            return (
              <Alert
                type="success" showIcon
                message={<Text>Total Gross Salary: <Text strong>{fmt(total)}</Text></Text>}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
            );
          }}
        </Form.Item>
      </Col>
      {[
        { name: "tdsDeducted",    label: "TDS Already Deducted (₹)",      required: true },
        { name: "interestIncome", label: "Interest Income (FD/Savings) (₹)", required: false },
        { name: "otherIncome",    label: "Other Income (₹)",              required: false },
      ].map(({ name, label, required }) => (
        <Col xs={24} sm={12} key={name}>
          <Form.Item name={name} label={label} rules={required ? [{ required: true }] : []}>
            <InputNumber {...numberFieldProps} />
          </Form.Item>
        </Col>
      ))}
    </Row>,

    // Step 2 — Property & Capital Gains
    <div key="2">
      <Title level={5} style={{ marginTop: 0 }}>House Property</Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Add each property the client owns. Self-occupied interest is only deductible under the Old Regime (capped at ₹2,00,000 combined); let-out property income/loss applies under both regimes.
      </Text>
      <Form.List name="houseProperties">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Card
                key={key}
                size="small"
                variant="borderless"
                style={{ borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}`, marginBottom: 12 }}
                extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />}
                title={`Property ${name + 1}`}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item {...restField} name={[name, "type"]} label="Type"
                      rules={[{ required: true, message: "Required" }]} initialValue="let_out"
                    >
                      <Radio.Group>
                        <Radio.Button value="self_occupied">Self-Occupied</Radio.Button>
                        <Radio.Button value="let_out">Let-Out</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={16}>
                    <Form.Item {...restField} name={[name, "address"]} label="Address">
                      <Input placeholder="Property address" />
                    </Form.Item>
                  </Col>
                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const type = form.getFieldValue(["houseProperties", name, "type"]);
                      if (type === "self_occupied") return null;
                      return (
                        <>
                          <Col xs={24} sm={8}>
                            <Form.Item {...restField} name={[name, "annualRent"]} label="Annual Rent Received (₹)">
                              <InputNumber {...numberFieldProps} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item {...restField} name={[name, "municipalTax"]} label="Municipal Tax Paid (₹)">
                              <InputNumber {...numberFieldProps} />
                            </Form.Item>
                          </Col>
                        </>
                      );
                    }}
                  </Form.Item>
                  <Col xs={24} sm={8}>
                    <Form.Item {...restField} name={[name, "interestOnLoan"]} label="Interest on Home Loan (₹)">
                      <InputNumber {...numberFieldProps} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ type: "let_out" })}>
              Add Property
            </Button>
          </>
        )}
      </Form.List>

      <Title level={5} style={{ marginTop: 24 }}>Equity Capital Gains</Title>
      <Alert
        type="info"
        showIcon
        icon={<RiseOutlined />}
        message="Enter the aggregate figures from the client's broker Capital Gains statement"
        description={`Short-term (Sec 111A): taxed at 20%. Long-term (Sec 112A): first ₹${CAPITAL_GAINS.SEC_112A_EXEMPTION.toLocaleString("en-IN")} exempt, balance taxed at 12.5%.`}
        style={{ marginBottom: 16, borderRadius: 8 }}
      />
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name="stcg111A" label="Short-Term Capital Gains — Sec 111A (₹)">
            <InputNumber {...numberFieldProps} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="ltcg112A" label="Long-Term Capital Gains — Sec 112A (₹)">
            <InputNumber {...numberFieldProps} />
          </Form.Item>
        </Col>
      </Row>
    </div>,

    // Step 3 — Deductions
    <Row gutter={16} key="3">
      {[
        { name: "sec80C",           label: "80C — PF, PPF, ELSS",      max: DEDUCTION_LIMITS.SEC_80C    },
        { name: "sec80CCD1B",       label: "80CCD(1B) — NPS",           max: DEDUCTION_LIMITS.SEC_80CCD_1B },
        { name: "sec80D_self",      label: "80D — Health Ins. (Self)",   max: DEDUCTION_LIMITS.SEC_80D_SELF },
        { name: "sec80D_parents",   label: "80D — Health Ins. (Parents)",max: DEDUCTION_LIMITS.SEC_80D_PARENTS },
        { name: "hra_exempt",       label: "HRA Exemption",              max: null   },
        { name: "lta",              label: "LTA Exemption",              max: null   },
        { name: "sec80TTA_TTB",     label: "80TTA/TTB — Savings Int.",   max: DEDUCTION_LIMITS.SEC_80TTA },
        { name: "sec80G",           label: "80G — Donations",            max: null   },
      ].map(({ name, label, max }) => (
        <Col xs={24} sm={12} key={name}>
          <Form.Item name={name} label={<span>{label}{max && <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>max {fmt(max)}</Text>}</span>}>
            <InputNumber {...numberFieldProps} max={max || undefined} />
          </Form.Item>
        </Col>
      ))}
    </Row>,

    <TaxSummary key="4" />,
  ];

  return (
    <div>
      <PageHeader
        onBack={() => navigate(`/ca/clients/${clientId}`)}
        title={`ITR-2 — ${client.fullName}`}
        period
        subtitle={
          <Space size={4}>
            <Tag icon={<TeamOutlined />} color="purple">CA Filing</Tag>
            <Text code style={{ fontSize: 11 }}>{client.pan}</Text>
          </Space>
        }
      />

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 8 }} closable onClose={() => setError(null)} />}

      <Card variant="borderless" style={{ borderRadius: 10, marginBottom: 24 }}>
        <Steps current={current} items={STEPS} />
      </Card>

      <Card variant="borderless" style={{ borderRadius: 10, marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          {stepContent[current]}
        </Form>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 10 }}>
        <Row justify="space-between">
          <Col>{current > 0 && <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrent((c) => c - 1)} size="large">Previous</Button>}</Col>
          <Col>
            {current < STEPS.length - 1 ? (
              <Button type="primary" icon={<ArrowRightOutlined />} size="large" onClick={next} loading={computing && current === 3}>
                {current === 3 ? "Compute Tax" : "Next"}
              </Button>
            ) : isAdmin ? (
              <Button type="primary" icon={<CheckCircleOutlined />} size="large" loading={submitting} onClick={handleSubmit} disabled={!taxResult}>
                Submit ITR-2 for Client
              </Button>
            ) : (
              <Tag color="blue" style={{ padding: "8px 16px", fontSize: 13 }}>
                Draft saved — ask your CA Admin to review and submit
              </Tag>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
}
