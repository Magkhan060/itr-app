import React, { useState, useEffect } from "react";
import {
  Steps, Card, Button, Form, Input, InputNumber,
  Select, DatePicker, Row, Col, Typography,
  Alert, Result, Tag, Space, Drawer,
  Tooltip, Spin, Grid, Upload, message, Radio,
  theme as antdTheme,
} from "antd";
import {
  UserOutlined, BankOutlined, FileTextOutlined,
  CheckCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  FilePdfOutlined, PaperClipOutlined, DownloadOutlined,
  SafetyCertificateOutlined, GlobalOutlined, InboxOutlined,
  ThunderboltOutlined, UploadOutlined, HomeOutlined,
  PlusOutlined, DeleteOutlined, RiseOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../../store/index.js";
import { useFilingStore } from "../../../store/index.js";
import { compareRegimesWithCG } from "../../../services/tax.service.js";
import { DEDUCTION_LIMITS, CAPITAL_GAINS, METRO_CITIES, isValidAadhaarChecksum } from "@itr-app/shared-types";
import { saveDraftITR2, submitITR2, downloadFilingXML } from "../../../services/filing.service.js";
import { getMyDocuments, uploadDocument } from "../../../services/document.service.js";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../components/PageHeader.jsx";
import FormSectionTitle from "../../../components/FormSectionTitle.jsx";

const { Dragger } = Upload;

const { Title, Text } = Typography;
const { Option }      = Select;
const { useBreakpoint } = Grid;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(n || 0);

const STEPS = [
  { title: "Personal",   icon: <UserOutlined />,        description: "Your details"        },
  { title: "Income",     icon: <BankOutlined />,         description: "Salary & others"     },
  { title: "Property & CG", icon: <HomeOutlined />,       description: "House property, capital gains" },
  { title: "Deductions", icon: <FileTextOutlined />,     description: "80C, 80D & more"     },
  { title: "Tax Summary", icon: <CheckCircleOutlined />, description: "Review & file"       },
];

// House property and capital gains are regime-independent in how they're
// computed here, EXCEPT self-occupied interest (Sec 24(b)), which is only
// deductible under the old regime — that figure is sent separately as
// deductions.homeLoanInterest so the engine's existing per-regime capping
// applies, rather than baking a regime assumption into otherIncome.
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

export default function ITR2Filing() {
  const { token }                        = antdTheme.useToken();
  const { user }                         = useAuthStore();
  const { updateFiling, filingData }     = useFilingStore();
  const [current, setCurrent]            = useState(0);
  const [form]                           = Form.useForm();
  const [taxResult, setTaxResult]        = useState(null);
  const [loading, setLoading]            = useState(false);
  const [error, setError]                = useState(null);
  const navigate                         = useNavigate();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted]         = useState(null);
  const screens                          = useBreakpoint();

  // ── Form 16 drawer state ─────────────────────────────────────
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [form16Doc, setForm16Doc]     = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading]     = useState(false);

  // ── XML download state ────────────────────────────────────────
  const [xmlLoading, setXmlLoading]   = useState(false);
  const [xmlError,   setXmlError]     = useState(null);

  useEffect(() => {
    setDocsLoading(true);
    getMyDocuments()
      .then((res) => {
        const docs   = res.data || [];
        const latest = docs.find(
          (d) => d.type === "form16" && d.parseStatus === "success"
        );
        setForm16Doc(latest || null);
      })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, []);

  useEffect(() => {
    if (user?.fullName) form.setFieldValue("fullName", user.fullName);
    if (user?.pan)      form.setFieldValue("pan",      user.pan);
  }, [user]);

  const handleForm16Upload = async ({ file }) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("type", "form16");
      formData.append("financialYear", "2025-26");
      const res = await uploadDocument(formData);
      setForm16Doc(res.data);
      message.success("Form 16 uploaded and parsed!");
    } catch (err) {
      message.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleUseForm16Values = () => {
    const p = form16Doc?.parsedData;
    if (!p) return;
    form.setFieldsValue({
      employerName:     p.employerName     || undefined,
      employerTAN:      p.employerTAN      || undefined,
      basicSalary:       p.basicSalary       || undefined,
      hra_received:      p.hraReceived       || undefined,
      specialAllowance:  p.specialAllowance  || undefined,
      bonus:             p.bonus             || undefined,
      professionalTax:   p.professionalTax   || undefined,
      tdsDeducted:       p.tdsDeducted       || undefined,
    });
    message.success("Form 16 values applied — review them in the Personal and Income steps");
    setDrawerOpen(false);
  };

  const STEP_FIELDS = [
    ["fullName", "pan", "dateOfBirth", "gender", "residentialStatus",
     "fatherName", "aadhaar", "mobile", "addressLine1", "pinCode",
     "city", "employerName", "employerTAN", "bankAccountNo", "ifscCode"],
    ["basicSalary", "hra_received", "specialAllowance", "bonus", "professionalTax", "tdsDeducted", "interestIncome", "otherIncome"],
    ["houseProperties", "stcg111A", "ltcg112A"],
    ["sec80C", "sec80CCD1B", "sec80D_self", "sec80D_parents", "hra_exempt", "lta", "sec80TTA_TTB", "sec80G"],
  ];

  const next = async () => {
    try {
      await form.validateFields(STEP_FIELDS[current]);
      const values = form.getFieldsValue(true);
      updateFiling(`step${current}`, values);

      const draftValues = { ...values };
      if (draftValues.dateOfBirth?.format) {
        draftValues.dateOfBirth = draftValues.dateOfBirth.format("YYYY-MM-DD");
      }

      await saveDraftITR2({
        itrType:        "ITR-2",
        assessmentYear: "2026-27",
        step:           current,
        data:           { ...filingData, [`step${current}`]: draftValues },
      }).catch(() => {});

      if (current === 3) await computeTaxSummary(values);
      setCurrent((c) => c + 1);
    } catch (_) {}
  };

  const prev = () => setCurrent((c) => c - 1);

  const handleSubmit = async () => {
    if (!taxResult) return;
    setSubmitLoading(true);
    try {
      const s0 = filingData.step0 || {};
      const s1 = filingData.step1 || {};
      const s2 = filingData.step2 || {};
      const s3 = filingData.step3 || {};

      const payload = {
        selectedRegime: taxResult.betterRegime === "equal" ? "new" : taxResult.betterRegime,
        personalInfo: {
          fullName:          s0.fullName,
          pan:               s0.pan || user?.pan,
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
          professionalTax:  s1.professionalTax  || 0,
          tdsDeducted:      s1.tdsDeducted      || 0,
          interestIncome:   s1.interestIncome   || 0,
          otherIncome:      s1.otherIncome       || 0,
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

      const res = await submitITR2(payload);
      setSubmitted(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const computeTaxSummary = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const allData = { ...filingData.step0, ...filingData.step1, ...filingData.step2, ...values };
      const grossIncome =
        (allData.basicSalary      || 0) +
        (allData.hra_received     || 0) +
        (allData.specialAllowance || 0) +
        (allData.bonus            || 0);

      const { letOutNetIncome, selfOccupiedInterest } = splitHouseProperty(allData.houseProperties || []);

      const payload = {
        grossIncome,
        otherIncome: (allData.interestIncome || 0) + (allData.otherIncome || 0) + letOutNetIncome,
        capitalGains: {
          stcg111A: allData.stcg111A || 0,
          ltcg112A: allData.ltcg112A || 0,
        },
        dateOfBirth: allData.dateOfBirth?.format?.("YYYY-MM-DD") || user?.dateOfBirth,
        deductions: {
          sec80C:           allData.sec80C           || 0,
          sec80CCD1B:       allData.sec80CCD1B       || 0,
          sec80D_self:      allData.sec80D_self       || 0,
          sec80D_parents:   allData.sec80D_parents   || 0,
          homeLoanInterest: selfOccupiedInterest,
          hra:              allData.hra_exempt        || 0,
          lta:              allData.lta              || 0,
          sec80TTA_TTB:     allData.sec80TTA_TTB     || 0,
          sec80G:           allData.sec80G           || 0,
        },
      };
      const res = await compareRegimesWithCG(payload);
      setTaxResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 0: Personal Info ────────────────────────────────────
  const PersonalInfo = () => (
    <>
      <Alert
        message="ITR-2 is for individuals with capital gains and/or more than one house property, who have no business income."
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
          <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
            <Select placeholder="Select gender">
              <Option value="M">Male</Option>
              <Option value="F">Female</Option>
              <Option value="T">Transgender</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="residentialStatus" label="Residential Status"
            rules={[{ required: true }]} initialValue="ROR"
          >
            <Select>
              <Option value="ROR">Resident &amp; Ordinarily Resident</Option>
              <Option value="RNOR">Resident but Not Ordinarily Resident</Option>
              <Option value="NR">Non-Resident</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="city" label="City of Employment" rules={[{ required: true }]}>
            <Select placeholder="Select city" showSearch>
              {[...METRO_CITIES, "Bengaluru", "Hyderabad", "Pune", "Ahmedabad", "Other"]
                .map((c) => (
                  <Option key={c} value={c}>
                    {c} {METRO_CITIES.includes(c) ? "🏙 Metro" : ""}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="fatherName" label="Father's Name">
            <Input prefix={<UserOutlined />} placeholder="FATHER'S FULL NAME" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="aadhaar" label="Aadhaar Number"
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
            <Input placeholder="1234 5678 9012" maxLength={12} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="mobile" label="Mobile (Aadhaar-linked)"
            rules={[{ pattern: /^[6-9]\d{9}$/, message: "Enter valid 10-digit mobile" }]}
          >
            <Input addonBefore="+91" placeholder="9876543210" maxLength={10} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="addressLine1" label="Address (Street / Flat / Colony)">
            <Input placeholder="19-4-438/A/10, Street 3, BNK Colony" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="pinCode" label="PIN Code"
            rules={[{ pattern: /^\d{6}$/, message: "PIN must be 6 digits" }]}
          >
            <Input placeholder="500064" maxLength={6} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} />
        <Col xs={24}>
          <Form.Item name="employerName" label="Employer Name" rules={[{ required: true }]}>
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
          <Form.Item name="bankAccountNo" label="Bank Account Number" rules={[{ required: true }]}>
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

  // ── Step 1: Salary & Other Income ────────────────────────────
  const SALARY_FIELDS = [
    { name: "basicSalary",      label: "Basic Salary (₹)",      required: true  },
    { name: "hra_received",     label: "HRA Received (₹)",      required: false },
    { name: "specialAllowance", label: "Special Allowance (₹)", required: false },
    { name: "bonus",            label: "Bonus (₹)",             required: false },
  ];
  const OTHER_SALARY_FIELDS = [
    { name: "professionalTax", label: "Professional Tax u/s 16(iii) (₹)", required: false },
    { name: "tdsDeducted",     label: "TDS Already Deducted (₹)",          required: true  },
  ];
  const OTHER_INCOME_FIELDS = [
    { name: "interestIncome", label: "Interest Income (FD/Savings) (₹)" },
    { name: "otherIncome",    label: "Any Other Income (₹)" },
  ];

  const numberFieldProps = {
    style: { width: "100%" }, min: 0,
    formatter: (v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    parser: (v) => v.replace(/₹\s?|(,*)/g, ""),
    placeholder: "0",
  };

  const IncomeDetails = () => (
    <>
      <FormSectionTitle first>Salary Income</FormSectionTitle>
      <Row gutter={16}>
        {SALARY_FIELDS.map(({ name, label, required }) => (
          <Col xs={24} sm={12} key={name}>
            <Form.Item name={name} label={label}
              rules={required ? [{ required: true, message: `${label} is required` }] : []}
            >
              <InputNumber {...numberFieldProps} />
            </Form.Item>
          </Col>
        ))}
      </Row>

      <Form.Item shouldUpdate noStyle>
        {() => {
          const v = form.getFieldsValue(["basicSalary", "hra_received", "specialAllowance", "bonus"]);
          const total = (v.basicSalary || 0) + (v.hra_received || 0) + (v.specialAllowance || 0) + (v.bonus || 0);
          return (
            <Alert
              type="success"
              showIcon
              message={<Text>Total Gross Salary: <Text strong>{fmt(total)}</Text></Text>}
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          );
        }}
      </Form.Item>

      <Row gutter={16}>
        {OTHER_SALARY_FIELDS.map(({ name, label, required }) => (
          <Col xs={24} sm={12} key={name}>
            <Form.Item name={name} label={label}
              rules={required ? [{ required: true, message: `${label} is required` }] : []}
            >
              <InputNumber {...numberFieldProps} />
            </Form.Item>
          </Col>
        ))}
      </Row>

      <FormSectionTitle>Other Income</FormSectionTitle>
      <Row gutter={16}>
        {OTHER_INCOME_FIELDS.map(({ name, label }) => (
          <Col xs={24} sm={12} key={name}>
            <Form.Item name={name} label={label}>
              <InputNumber {...numberFieldProps} />
            </Form.Item>
          </Col>
        ))}
      </Row>
    </>
  );

  // ── Step 2: Property & Capital Gains ─────────────────────────
  const PropertyAndCapitalGains = () => (
    <>
      <FormSectionTitle first>House Property</FormSectionTitle>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Add each property you own. Self-occupied property interest is only deductible under the Old Regime (capped at ₹2,00,000 combined); let-out property income/loss applies under both regimes.
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

      <FormSectionTitle>Equity Capital Gains</FormSectionTitle>
      <Alert
        type="info"
        showIcon
        icon={<RiseOutlined />}
        message="Enter the aggregate figures from your broker's Capital Gains statement"
        description={`Short-term (Sec 111A): taxed at 20%. Long-term (Sec 112A): first ₹${CAPITAL_GAINS.SEC_112A_EXEMPTION.toLocaleString("en-IN")} exempt, balance taxed at 12.5%. Only listed equity / equity mutual funds with STT paid — debt funds, property, and unlisted shares are not supported yet.`}
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
    </>
  );

  // ── Step 3: Deductions ────────────────────────────────────────
  const DEDUCTION_FIELDS = [
    { name: "sec80C",         label: "80C — PF, PPF, ELSS, LIC",          max: DEDUCTION_LIMITS.SEC_80C },
    { name: "sec80CCD1B",     label: "80CCD(1B) — NPS",                   max: DEDUCTION_LIMITS.SEC_80CCD_1B },
    { name: "sec80D_self",    label: "80D — Health Insurance (Self)",     max: DEDUCTION_LIMITS.SEC_80D_SELF },
    { name: "sec80D_parents", label: "80D — Health Insurance (Parents)",  max: DEDUCTION_LIMITS.SEC_80D_PARENTS },
    { name: "hra_exempt",     label: "HRA Exemption",                     max: null },
    { name: "lta",            label: "LTA Exemption",                     max: null },
    { name: "sec80TTA_TTB",   label: "80TTA/TTB — Savings Interest",      max: DEDUCTION_LIMITS.SEC_80TTA },
    { name: "sec80G",         label: "80G — Donations",                   max: null },
  ];

  const DeductionsForm = () => (
    <>
      <Alert
        message="Deductions below apply only if you choose the Old Tax Regime. Home loan interest for self-occupied property is captured in the Property & Capital Gains step instead."
        type="warning" showIcon style={{ marginBottom: 20, borderRadius: 8 }}
      />
      <Row gutter={16}>
        {DEDUCTION_FIELDS.map(({ name, label, max }) => (
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
              <InputNumber {...numberFieldProps} max={max || undefined} />
            </Form.Item>
          </Col>
        ))}
      </Row>
    </>
  );

  // ── Step 4: Tax Summary ───────────────────────────────────────
  const TaxSummary = () => {
    if (loading) return <div className="text-center py-10"><Text>Computing your taxes...</Text></div>;
    if (error)   return <Alert type="error" message={error} showIcon />;
    if (!taxResult) return null;

    const { old: o, new: n, betterRegime, savingsAmount } = taxResult;
    const recommended = betterRegime === "new" ? n : o;

    return (
      <>
        <Alert
          message={
            <Text>
              <Text strong>{betterRegime === "new" ? "New Regime" : "Old Regime"}</Text>{" "}
              saves you{" "}
              <Text strong style={{ color: "#52c41a" }}>{fmt(savingsAmount)}</Text>{" "}
              more in taxes.
            </Text>
          }
          type="success"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          {[
            { label: "Old Regime", data: o },
            { label: "New Regime", data: n },
          ].map(({ label, data }) => (
            <Col span={12} key={label}>
              <Card
                variant="borderless"
                size="small"
                style={{
                  borderRadius: 10,
                  outline: data === recommended ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`,
                }}
                title={
                  <Space>
                    <Text strong>{label}</Text>
                    {data === recommended && <Tag color="blue">Recommended</Tag>}
                  </Space>
                }
              >
                {[
                  ["Slab Income (Salary + Others)", data.slabTaxableIncome],
                  ["Slab Tax (after rebate)",        data.slabTaxPostRebate],
                  ["STCG (Sec 111A) Tax",            data.capitalGains?.stcgTax],
                  ["LTCG (Sec 112A) Tax",            data.capitalGains?.ltcgTax],
                  ["Surcharge",                       data.surcharge],
                  ["Cess (4%)",                       data.cess],
                  ["Total Tax",                       data.totalTax],
                ].map(([lbl, val]) => (
                  <div key={lbl}
                    className="flex justify-between py-1"
                    style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>{lbl}</Text>
                    <Text strong style={{ fontSize: 12,
                      color: lbl === "Total Tax" ? token.colorPrimary : "inherit" }}
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
          message="Your ITR-2 draft is ready. Review details and submit to complete e-Filing."
          type="info" showIcon style={{ borderRadius: 8 }}
        />
      </>
    );
  };

  const stepContent = [
    <PersonalInfo            key="0" />,
    <IncomeDetails           key="1" />,
    <PropertyAndCapitalGains key="2" />,
    <DeductionsForm          key="3" />,
    <TaxSummary              key="4" />,
  ];

  // ── Submission success screen ────────────────────────────────
  const handleDownloadXML = async () => {
    setXmlLoading(true);
    setXmlError(null);
    try {
      const blob = await downloadFilingXML(submitted.filing._id);
      const url  = URL.createObjectURL(new Blob([blob], { type: "application/xml" }));
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `ITR2_AY2026-27_${submitted.acknowledgementNo}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setXmlError("Could not generate XML. Please try again.");
    } finally {
      setXmlLoading(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
          title="ITR-2 Prepared Successfully!"
          subTitle={
            <div>
              <p>App Acknowledgement: <Text code strong>{submitted.acknowledgementNo}</Text></p>
              <p>Assessment Year: <strong>AY 2026-27</strong></p>
              <p>
                Total Tax:{" "}
                <strong style={{ color: "#fa541c" }}>{fmt(submitted.taxSummary?.totalTax)}</strong>
              </p>
            </div>
          }
          extra={[
            <Button
              type="primary"
              key="xml"
              icon={<DownloadOutlined />}
              loading={xmlLoading}
              onClick={handleDownloadXML}
            >
              Download ITR XML
            </Button>,
            <Button key="dashboard" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>,
          ]}
        />

        {xmlError && (
          <Alert type="error" message={xmlError} showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
        )}

        <Card style={{ maxWidth: 680, margin: "0 auto", borderRadius: 10 }} variant="borderless">
          <Alert
            type="info"
            showIcon
            icon={<GlobalOutlined />}
            message={<strong>How to file on the Income Tax Portal (incometax.gov.in)</strong>}
            description={
              <ol style={{ paddingLeft: 20, margin: "8px 0 0", lineHeight: 2 }}>
                <li>Click <strong>Download ITR XML</strong> above to save your pre-filled return</li>
                <li>
                  Go to{" "}
                  <a href="https://www.incometax.gov.in/iec/foportal/" target="_blank" rel="noreferrer">
                    incometax.gov.in
                  </a>{" "}
                  and log in with your PAN and password
                </li>
                <li>Navigate to <strong>e-File → Income Tax Returns → File Income Tax Return</strong></li>
                <li>Select <strong>AY 2026-27</strong>, then <strong>ITR-2</strong>, then <strong>Upload ITR</strong></li>
                <li>Choose <strong>Upload XML</strong> and select the downloaded file</li>
                <li>Verify using <strong>Aadhaar OTP</strong> or <strong>Net Banking EVC</strong> to complete filing</li>
                <li>Save the <strong>ITR-V Acknowledgement</strong> sent to your registered email</li>
              </ol>
            }
            style={{ borderRadius: 8 }}
          />
        </Card>
      </div>
    );
  }

  const drawerWidth = screens.lg ? 680 : "100%";

  return (
    <div>
      <PageHeader
        icon={<FileTextOutlined />}
        title="ITR-2 Filing"
        subtitle="Capital gains & multiple house properties"
        period
        extra={
          <Tooltip
            title={
              docsLoading  ? "Checking for Form 16…" :
              form16Doc    ? `Open ${form16Doc.originalName} for reference` :
                             "No Form 16 uploaded yet — upload one below"
            }
          >
            <Button
              icon={docsLoading ? <Spin size="small" /> : <PaperClipOutlined />}
              onClick={() => setDrawerOpen(true)}
              disabled={docsLoading}
              style={{
                borderColor: form16Doc ? "#1677ff" : undefined,
                color:       form16Doc ? "#1677ff" : undefined,
              }}
            >
              {screens.sm ? "View Form 16" : ""}
            </Button>
          </Tooltip>
        }
      />

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
          <Col>
            {current > 0 && (
              <Button icon={<ArrowLeftOutlined />} onClick={prev} size="large">
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
                loading={loading && current === 3}
              >
                {current === 3 ? "Compute Tax" : "Next"}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="large"
                loading={submitLoading}
                onClick={handleSubmit}
                disabled={!taxResult}
              >
                Submit ITR-2
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={drawerWidth}
        title={
          <Space>
            <FilePdfOutlined style={{ color: "#ff4d4f" }} />
            <span>{form16Doc ? form16Doc.originalName : "Form 16 Reference"}</span>
            {form16Doc && (
              <Tag color="blue" style={{ fontSize: 11 }}>FY {form16Doc.financialYear}</Tag>
            )}
          </Space>
        }
        styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}
      >
        {form16Doc ? (
          <>
            <div style={{
              padding: "12px 16px", borderBottom: `1px solid ${token.colorBorderSecondary}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 8,
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {form16Doc.parsedData
                  ? `Parsed with ${form16Doc.parsedData.confidence ?? 0}% confidence`
                  : "Uploaded"}
              </Text>
              <Space>
                {form16Doc.parsedData && (
                  <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={handleUseForm16Values}>
                    Use These Values
                  </Button>
                )}
                <Upload
                  accept=".pdf"
                  multiple={false}
                  showUploadList={false}
                  disabled={uploading}
                  beforeUpload={(file) => { handleForm16Upload({ file }); return false; }}
                >
                  <Button size="small" icon={<UploadOutlined />} loading={uploading}>Replace</Button>
                </Upload>
              </Space>
            </div>
            <iframe
              src={`/uploads/${form16Doc.storedName}`}
              title="Form 16 PDF"
              style={{ flex: 1, width: "100%", height: "100%", border: "none", minHeight: "70vh" }}
            />
          </>
        ) : (
          <div style={{ padding: 32 }}>
            {uploading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Spin size="large" />
                <p style={{ marginTop: 12 }}>Uploading and parsing Form 16...</p>
              </div>
            ) : (
              <Dragger
                accept=".pdf"
                multiple={false}
                showUploadList={false}
                beforeUpload={(file) => { handleForm16Upload({ file }); return false; }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: "#1677ff" }} />
                </p>
                <p className="ant-upload-text">Click or drag your Form 16 PDF here</p>
                <p className="ant-upload-hint">PDF only · Max 5MB · FY 2025-26 — we'll parse it and offer to fill the form for you</p>
              </Dragger>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
