import React, { useState, useEffect } from "react";
import {
  Steps, Card, Button, Form, Input, Select, Row, Col,
  Typography, Alert, Space, Tag, Result, Spin, Divider,
  Descriptions, Statistic, Badge,
} from "antd";
import {
  SafetyCertificateOutlined, MobileOutlined, BankOutlined,
  CheckCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  FileTextOutlined, CloudUploadOutlined, DownloadOutlined,
  ExclamationCircleOutlined, LockOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../../store/index.js";
import { getMyFilings, getFilingById } from "../../../services/filing.service.js";
import { generateEVC, validateEVC, submitReturn, downloadXML } from "../../../services/efiling.service.js";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(n || 0);

const EVC_METHODS = [
  {
    value: "aadhaar_otp",
    label: "Aadhaar OTP",
    icon:  <MobileOutlined />,
    desc:  "OTP sent to your Aadhaar-linked mobile number",
  },
  {
    value: "bank_evc",
    label: "Bank Account EVC",
    icon:  <BankOutlined />,
    desc:  "Pre-validated via net banking or bank ATM",
  },
  {
    value: "net_banking",
    label: "Net Banking",
    icon:  <SafetyCertificateOutlined />,
    desc:  "Login via your bank's net banking portal",
  },
];

const STEPS = [
  { title: "Review",  description: "Verify your ITR" },
  { title: "Verify",  description: "Electronic signature" },
  { title: "Submit",  description: "Send to ITD portal" },
];

export default function EFilingPage() {
  const { user }          = useAuthStore();
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const filingIdParam     = searchParams.get("filingId");
  const [form]            = Form.useForm();

  const [current, setCurrent]     = useState(0);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filing, setFiling]       = useState(null);
  const [error, setError]         = useState(null);

  // EVC flow state
  const [evcMethod, setEvcMethod]   = useState("aadhaar_otp");
  const [requestId, setRequestId]   = useState(null);
  const [otpSent, setOtpSent]       = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [evc, setEvc]               = useState(null);
  const [mockMode, setMockMode]     = useState(false);

  // Submission result
  const [result, setResult] = useState(null);

  useEffect(() => {
    setLoading(true);

    if (filingIdParam) {
      // Specific filing requested — CA portal passes ?filingId=<id> from ClientWorkspace.
      // Fetch that exact filing so we always e-file the correct client's return.
      getFilingById(filingIdParam)
        .then((res) => setFiling(res.data))
        .catch(() => setError("Filing not found or you do not have access to it."))
        .finally(() => setLoading(false));
    } else {
      // No filingId in URL — self-filing taxpayer flow: auto-pick the right filing.
      getMyFilings()
        .then((res) => {
          const filings = res.data || [];
          // Pick the most recent submitted ITR-1 that hasn't been e-filed yet
          const target = filings.find(
            (f) => f.itrType === "ITR-1" && f.status === "submitted" && f.efilingStatus !== "submitted"
          );
          // If already e-filed, show the acknowledgement
          const efiled = filings.find(
            (f) => f.itrType === "ITR-1" && f.efilingStatus === "submitted"
          );
          setFiling(target || efiled || null);
        })
        .catch(() => setError("Failed to load your filings. Please try again."))
        .finally(() => setLoading(false));
    }
  }, [filingIdParam]);

  // ── Step 0: Review ───────────────────────────────────────────────────────
  const ReviewStep = () => {
    if (!filing) return null;
    const d   = filing.itr1Data || {};
    const tax = d.taxComputation || {};

    return (
      <>
        <Alert
          type="info"
          showIcon
          icon={<SafetyCertificateOutlined />}
          message="Review your ITR-1 before submitting to the Income Tax Department"
          description="Once submitted, you cannot modify this return. Verify all figures carefully."
          style={{ marginBottom: 24, borderRadius: 8 }}
        />

        <Descriptions
          title="Personal Information"
          bordered
          size="small"
          column={{ xs: 1, sm: 2 }}
          style={{ marginBottom: 20 }}
        >
          <Descriptions.Item label="Name">{d.fullName || "—"}</Descriptions.Item>
          <Descriptions.Item label="PAN"><Text code>{d.pan || "—"}</Text></Descriptions.Item>
          <Descriptions.Item label="Assessment Year">AY {filing.assessmentYear}</Descriptions.Item>
          <Descriptions.Item label="Employer">{d.employerName || "—"}</Descriptions.Item>
          <Descriptions.Item label="Employer TAN"><Text code>{d.employerTAN || "—"}</Text></Descriptions.Item>
          <Descriptions.Item label="City">{d.city || "—"}</Descriptions.Item>
        </Descriptions>

        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          {[
            { label: "Gross Salary",   value: d.grossSalary,    color: "#1677ff" },
            { label: "TDS Deducted",   value: d.tdsDeducted,    color: "#52c41a" },
            { label: "Total Tax",      value: tax.totalTax,     color: "#fa541c" },
            { label: "Refund / Payable",
              value: Math.max(0, (d.tdsDeducted || 0) - (tax.totalTax || 0)),
              color: "#722ed1",
            },
          ].map(({ label, value, color }) => (
            <Col xs={12} sm={6} key={label}>
              <Card variant="borderless" style={{ borderRadius: 8, border: "1px solid #f0f0f0", textAlign: "center" }}>
                <Statistic
                  title={<Text style={{ fontSize: 11 }}>{label}</Text>}
                  value={fmt(value)}
                  valueStyle={{ color, fontSize: 15, fontWeight: 600 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Descriptions
          title="Tax Regime Selected"
          bordered
          size="small"
          column={1}
        >
          <Descriptions.Item label="Regime">
            <Tag color={d.selectedRegime === "new" ? "blue" : "purple"}>
              {d.selectedRegime === "new" ? "New Tax Regime" : "Old Tax Regime"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Taxable Income">{fmt(tax.taxableIncome)}</Descriptions.Item>
          <Descriptions.Item label="Tax + Cess">
            {fmt((tax.totalTax || 0) - (tax.surcharge || 0))} + Surcharge {fmt(tax.surcharge)}
          </Descriptions.Item>
          <Descriptions.Item label="Effective Rate">
            <Text strong style={{ color: "#52c41a" }}>{tax.effectiveRate || "0"}%</Text>
          </Descriptions.Item>
        </Descriptions>

        <Alert
          type="warning"
          showIcon
          message={`Internal Ack No: ${filing.acknowledgementNo}`}
          description="This is your app-level acknowledgement. The ITD acknowledgement number (ITR-V) will be generated after e-filing."
          style={{ marginTop: 20, borderRadius: 8 }}
        />
      </>
    );
  };

  // ── Step 1: EVC Verification ──────────────────────────────────────────────
  const sendOTP = async () => {
    setOtpLoading(true);
    setError(null);
    try {
      const res = await generateEVC({ pan: filing.itr1Data.pan, method: evcMethod });
      setRequestId(res.data.requestId);
      setMockMode(res.data.mockMode || false);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOTP = async () => {
    try {
      const values = await form.validateFields(["otp"]);
      setOtpLoading(true);
      setError(null);
      const res = await validateEVC({ requestId, otp: values.otp, pan: filing.itr1Data.pan });
      setEvc(res.data.evc);
      setMockMode(res.data.mockMode || false);
    } catch (err) {
      if (err?.errorFields) return; // form validation error
      setError(err.response?.data?.error || err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const EVCStep = () => (
    <>
      <Alert
        type="info"
        showIcon
        icon={<LockOutlined />}
        message="Electronic Verification Code (EVC)"
        description="The Income Tax Department requires your return to be digitally signed. Choose a verification method below."
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      {mockMode && (
        <Alert
          type="warning"
          showIcon
          message="Running in mock mode — ITD API credentials not configured"
          description="Enter any 6-digit OTP (e.g. 123456) to proceed. Set ITD_API_BASE_URL and ITD_API_KEY in the API .env file for live submission."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
      )}

      {!otpSent ? (
        <>
          <Title level={5} style={{ marginBottom: 12 }}>Select Verification Method</Title>
          <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
            {EVC_METHODS.map((m) => (
              <Col xs={24} sm={8} key={m.value}>
                <div
                  onClick={() => setEvcMethod(m.value)}
                  style={{
                    padding:      16,
                    borderRadius: 10,
                    border:       `2px solid ${evcMethod === m.value ? "#1677ff" : "#f0f0f0"}`,
                    background:   evcMethod === m.value ? "#e6f4ff" : "#fff",
                    cursor:       "pointer",
                    transition:   "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: 22, color: "#1677ff", marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ color: "#8c8c8c", fontSize: 12 }}>{m.desc}</div>
                </div>
              </Col>
            ))}
          </Row>

          <Button
            type="primary"
            size="large"
            icon={<MobileOutlined />}
            loading={otpLoading}
            onClick={sendOTP}
          >
            Send OTP
          </Button>
        </>
      ) : evc ? (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="EVC Verified Successfully"
          description={
            <>
              Your electronic verification is complete.
              <Text code style={{ display: "block", marginTop: 8, fontSize: 11 }}>
                EVC: {evc}
              </Text>
            </>
          }
          style={{ borderRadius: 8 }}
        />
      ) : (
        <>
          <Alert
            type="success"
            message="OTP sent to your registered mobile"
            description={mockMode ? "Mock mode: enter any 6-digit number, e.g. 123456" : "Check your Aadhaar-linked mobile for the OTP."}
            style={{ marginBottom: 20, borderRadius: 8 }}
            showIcon
          />

          <Form form={form} layout="vertical">
            <Form.Item
              name="otp"
              label="Enter OTP"
              rules={[
                { required: true, message: "Please enter the OTP" },
                { pattern: /^\d{6}$/, message: "OTP must be exactly 6 digits" },
              ]}
            >
              <Input
                prefix={<LockOutlined />}
                placeholder="6-digit OTP"
                maxLength={6}
                size="large"
                style={{ maxWidth: 240 }}
              />
            </Form.Item>
          </Form>

          <Space>
            <Button type="primary" size="large" loading={otpLoading} onClick={verifyOTP}>
              Verify OTP
            </Button>
            <Button
              size="large"
              loading={otpLoading}
              onClick={() => { setOtpSent(false); setRequestId(null); }}
            >
              Resend OTP
            </Button>
          </Space>
        </>
      )}
    </>
  );

  // ── Step 2: Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitReturn({
        filingId: filing._id,
        evc,
        evcMethod,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadXML = async () => {
    try {
      const blob = await downloadXML(filing._id);
      const url  = URL.createObjectURL(new Blob([blob], { type: "application/xml" }));
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `ITR1_${filing._id}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — non-critical
    }
  };

  const SubmitStep = () => (
    <>
      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
      )}
      <Alert
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        message="Ready to submit to the Income Tax Department"
        description={
          <>
            <div>PAN: <Text code>{filing?.itr1Data?.pan}</Text></div>
            <div style={{ marginTop: 4 }}>AY: <strong>{filing?.assessmentYear}</strong></div>
            <div style={{ marginTop: 4 }}>
              EVC Method:{" "}
              <Tag color="blue">
                {EVC_METHODS.find((m) => m.value === evcMethod)?.label}
              </Tag>
            </div>
          </>
        }
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      {mockMode && (
        <Alert
          type="warning"
          showIcon
          message="Mock submission — no real ITD API call will be made"
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Paragraph>
        By clicking <strong>Submit to ITD</strong>, you confirm that the information provided in
        this return is correct and complete to the best of your knowledge and belief. Once submitted,
        you will receive an ITR-V acknowledgement that must be verified within 30 days.
      </Paragraph>

      <Space>
        <Button
          type="primary"
          size="large"
          icon={<CloudUploadOutlined />}
          loading={submitting}
          onClick={handleSubmit}
        >
          Submit to ITD
        </Button>
        <Button size="large" icon={<DownloadOutlined />} onClick={handleDownloadXML}>
          Download XML
        </Button>
      </Space>
    </>
  );

  // ── Navigation ────────────────────────────────────────────────────────────
  const canProceed = () => {
    if (current === 0) return !!filing;
    if (current === 1) return !!evc;
    return false;
  };

  const stepContent = [<ReviewStep key="0" />, <EVCStep key="1" />, <SubmitStep key="2" />];

  // ── Already e-filed ───────────────────────────────────────────────────────
  if (!loading && filing?.efilingStatus === "submitted") {
    return (
      <Result
        status="success"
        icon={<SafetyCertificateOutlined style={{ color: "#52c41a" }} />}
        title="ITR Successfully E-Filed!"
        subTitle={
          <div>
            <p>
              ITR-V Acknowledgement:{" "}
              <Text code strong>{filing.itrVAckNo}</Text>
            </p>
            <p>Assessment Year: <strong>AY {filing.assessmentYear}</strong></p>
            <p style={{ color: "#8c8c8c", fontSize: 12, marginTop: 8 }}>
              Your ITR-V has been sent to your registered email. Verify it within 30 days by logging in
              to the Income Tax e-Filing portal or sending the signed ITR-V to CPC, Bengaluru.
            </p>
          </div>
        }
        extra={[
          <Button
            type="primary"
            key="dashboard"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>,
          <Button
            key="xml"
            icon={<DownloadOutlined />}
            onClick={() => downloadXML(filing._id).then((blob) => {
              const url = URL.createObjectURL(new Blob([blob], { type: "application/xml" }));
              const a   = document.createElement("a");
              a.href     = url;
              a.download = `ITR1_${filing._id}.xml`;
              a.click();
              URL.revokeObjectURL(url);
            }).catch(() => {})}
          >
            Download ITR XML
          </Button>,
        ]}
      />
    );
  }

  // ── Submission success ────────────────────────────────────────────────────
  if (result) {
    return (
      <Result
        status="success"
        icon={<SafetyCertificateOutlined style={{ color: "#52c41a" }} />}
        title="ITR-1 Filed with the Income Tax Department!"
        subTitle={
          <div>
            <p>
              ITR-V Acknowledgement No:{" "}
              <Text code strong style={{ fontSize: 14 }}>{result.itrVAckNo}</Text>
            </p>
            {result.mockMode && (
              <Tag color="orange" style={{ marginTop: 8 }}>Mock Submission</Tag>
            )}
            <Divider />
            <p style={{ color: "#595959" }}>
              <strong>Next steps:</strong>
            </p>
            <ul style={{ textAlign: "left", display: "inline-block", color: "#595959" }}>
              <li>Download your ITR-V from the ITD portal at <Text code>incometax.gov.in</Text></li>
              <li>Verify your ITR within 30 days via net banking, Aadhaar OTP, or by sending signed ITR-V to CPC, Bengaluru</li>
              <li>Save your acknowledgement number: <Text code>{result.itrVAckNo}</Text></li>
            </ul>
          </div>
        }
        extra={[
          <Button
            type="primary"
            key="dashboard"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>,
          <Button
            key="xml"
            icon={<DownloadOutlined />}
            onClick={() => downloadXML(filing._id).then((blob) => {
              const url = URL.createObjectURL(new Blob([blob], { type: "application/xml" }));
              const a   = document.createElement("a");
              a.href     = url;
              a.download = `ITR1_${filing._id}.xml`;
              a.click();
              URL.revokeObjectURL(url);
            }).catch(() => {})}
          >
            Download ITR XML
          </Button>,
        ]}
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" tip="Loading your filing…" />
      </div>
    );
  }

  // ── No eligible filing ────────────────────────────────────────────────────
  if (!filing) {
    return (
      <Result
        icon={<ExclamationCircleOutlined style={{ color: "#faad14" }} />}
        title="No Submitted ITR Found"
        subTitle="You need to complete and submit your ITR-1 form before e-filing it with the Income Tax Department."
        extra={[
          <Button type="primary" key="file" onClick={() => navigate("/filing/itr1")}>
            Start ITR-1 Filing
          </Button>,
          <Button key="dashboard" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>,
        ]}
      />
    );
  }

  // ── Main flow ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <SafetyCertificateOutlined style={{ fontSize: 28, color: "#1677ff" }} />
        <div>
          <Title level={3} style={{ margin: 0 }}>e-File ITR-1</Title>
          <Text type="secondary">
            Submit to Income Tax Department · AY {filing.assessmentYear} ·{" "}
            <Text code>{filing.itr1Data?.pan}</Text>
          </Text>
        </div>
      </div>

      {/* Steps indicator */}
      <Card variant="borderless" style={{ borderRadius: 10, marginBottom: 24 }}>
        <Steps current={current} items={STEPS} />
      </Card>

      {/* Step content */}
      <Card variant="borderless" style={{ borderRadius: 10, marginBottom: 16 }}>
        {stepContent[current]}
      </Card>

      {/* Navigation */}
      <Card variant="borderless" style={{ borderRadius: 10 }}>
        <Row justify="space-between">
          <Col>
            {current > 0 && (
              <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrent((c) => c - 1)} size="large">
                Back
              </Button>
            )}
          </Col>
          <Col>
            {current < STEPS.length - 1 && (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                size="large"
                disabled={!canProceed()}
                onClick={() => setCurrent((c) => c + 1)}
              >
                {current === 0 ? "Proceed to Verify" : "Proceed to Submit"}
              </Button>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
}
