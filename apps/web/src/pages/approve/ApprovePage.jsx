import React, { useEffect, useState } from "react";
import {
  Card, Button, Typography, Spin, Alert, Result,
  Descriptions, Statistic, Row, Col, Input, Space, Tag, Divider, Table,
} from "antd";
import {
  CheckCircleOutlined, CloseCircleOutlined,
  SafetyCertificateOutlined, ExclamationCircleOutlined,
  FileDoneOutlined, BankOutlined, FileTextOutlined,
} from "@ant-design/icons";
import { useParams, useSearchParams } from "react-router-dom";
import { getApprovalSummary, respondToApproval } from "../../services/ca.service.js";

const { Title, Text, Paragraph } = Typography;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export default function ApprovePage() {
  const { token }          = useParams();
  const [searchParams]     = useSearchParams();
  const defaultAction      = searchParams.get("action"); // "approve" or "reject" from email link

  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [action, setAction]       = useState(null);  // "approve" | "reject"
  const [comment, setComment]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState(null);

  useEffect(() => {
    getApprovalSummary(token)
      .then((res) => {
        setSummary(res.data);
        // If action is pre-set from email link query param, show the confirm UI
        if (defaultAction && ["approve", "reject"].includes(defaultAction)) {
          setAction(defaultAction);
        }
        // If already responded, skip to result
        if (res.data.approvalStatus !== "pending") {
          setResult({ status: res.data.approvalStatus, alreadyDone: true });
        }
      })
      .catch(() => setError("This approval link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRespond = async () => {
    setSubmitting(true);
    try {
      const res = await respondToApproval(token, action, comment);
      setResult({ status: res.data.status });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" tip="Loading your ITR details…" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: 480, borderRadius: 12, width: "90%" }}>
          <Result icon={<ExclamationCircleOutlined style={{ color: "#faad14" }} />} title="Link Invalid or Expired" subTitle={error} />
        </Card>
      </div>
    );
  }

  // Already responded
  if (result?.alreadyDone) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: 480, borderRadius: 12, width: "90%" }}>
          <Result
            icon={
              summary.approvalStatus === "approved"
                ? <CheckCircleOutlined style={{ color: "#52c41a" }} />
                : <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
            }
            title={summary.approvalStatus === "approved" ? "You've Already Approved This Filing" : "You've Already Requested Changes"}
            subTitle="Your CA has been notified. No further action needed on this link."
          />
        </Card>
      </div>
    );
  }

  // Success after responding
  if (result && !result.alreadyDone) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ maxWidth: 520, borderRadius: 12, width: "90%" }}>
          <Result
            status={result.status === "approved" ? "success" : "warning"}
            icon={result.status === "approved"
              ? <CheckCircleOutlined style={{ color: "#52c41a" }} />
              : <ExclamationCircleOutlined style={{ color: "#faad14" }} />}
            title={result.status === "approved" ? "ITR Filing Approved!" : "Changes Requested"}
            subTitle={
              result.status === "approved"
                ? "Your CA has been notified and will proceed with e-filing your ITR-1 with the Income Tax Department."
                : "Your CA has been notified of your request for changes. They will contact you shortly."
            }
          />
        </Card>
      </div>
    );
  }

  const s = summary.summary;
  const isRefund    = s.refundDue > 0;
  const isNewRegime = s.selectedRegime === "new";

  const incomeRows = [
    { label: "Gross Salary",                   amount: s.grossSalary,    indent: false },
    { label: "Less: Standard Deduction u/s 16(ia)", amount: -s.standardDeduction, indent: true },
    !isNewRegime && s.hraExempt > 0 && { label: "Less: HRA Exemption u/s 10(13A)", amount: -s.hraExempt, indent: true },
    s.professionalTax > 0 && { label: "Less: Professional Tax u/s 16(iii)", amount: -s.professionalTax, indent: true },
    { label: "Net Income from Salary",          amount: s.grossSalary - s.standardDeduction - (isNewRegime ? 0 : s.hraExempt) - s.professionalTax, bold: true },
    (s.interestIncome + s.otherIncome) > 0 && { label: "Income from Other Sources",        amount: s.interestIncome + s.otherIncome },
    { label: "Gross Total Income",              amount: s.taxableIncome + (isNewRegime ? 0 : (s.sec80C + s.sec80CCD1B + s.sec80D + s.sec80TTA + s.sec80G)), bold: true },
  ].filter(Boolean);

  const deductionRows = !isNewRegime ? [
    s.sec80C      > 0 && { label: "80C (LIP, PPF, ELSS, etc.)",      amount: Math.min(s.sec80C, 150000) },
    s.sec80CCD1B  > 0 && { label: "80CCD(1B) (NPS)",                  amount: Math.min(s.sec80CCD1B, 50000) },
    s.sec80D      > 0 && { label: "80D (Health Insurance)",           amount: s.sec80D },
    s.sec80TTA    > 0 && { label: "80TTA (Savings Bank Interest)",    amount: Math.min(s.sec80TTA, 10000) },
    s.sec80G      > 0 && { label: "80G (Donations)",                  amount: s.sec80G },
  ].filter(Boolean) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "32px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <FileDoneOutlined style={{ fontSize: 40, color: "#1677ff" }} />
          <Title level={2} style={{ marginTop: 10, marginBottom: 4 }}>Review Your ITR-1</Title>
          <Text type="secondary">FY 2025-26 | AY {summary.assessmentYear}</Text>
        </div>

        {/* CA info */}
        <Alert
          type="info"
          showIcon
          message={`Prepared by ${summary.ca.fullName}${summary.ca.firmName ? ` (${summary.ca.firmName})` : ""}`}
          description="Your Chartered Accountant has prepared your Income Tax Return. Please review the details below carefully before approving."
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        {/* Assessee & Employer */}
        <Card
          variant="borderless"
          style={{ borderRadius: 10, marginBottom: 16, border: "1px solid #e8e8e8" }}
          title={<Space><FileTextOutlined /><span>Assessee Details</span></Space>}
          size="small"
        >
          <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
            <Descriptions.Item label="Name">{summary.client.fullName}</Descriptions.Item>
            <Descriptions.Item label="PAN"><Text code>{summary.client.pan}</Text></Descriptions.Item>
            <Descriptions.Item label="Assessment Year">AY {summary.assessmentYear}</Descriptions.Item>
            <Descriptions.Item label="Tax Regime">
              <Tag color={isNewRegime ? "blue" : "purple"}>
                {isNewRegime ? "New Tax Regime (115BAC)" : "Old Tax Regime"}
              </Tag>
            </Descriptions.Item>
            {s.employerName && <Descriptions.Item label="Employer" span={2}>{s.employerName}</Descriptions.Item>}
            {s.employerTAN  && <Descriptions.Item label="Employer TAN"><Text code>{s.employerTAN}</Text></Descriptions.Item>}
          </Descriptions>
        </Card>

        {/* Income computation */}
        <Card
          variant="borderless"
          style={{ borderRadius: 10, marginBottom: 16, border: "1px solid #e8e8e8" }}
          title={<Space><SafetyCertificateOutlined /><span>Computation of Total Income</span></Space>}
          size="small"
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {incomeRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "6px 4px", paddingLeft: row.indent ? 20 : 4, color: row.bold ? "#000" : "#595959" }}>
                    {row.bold ? <strong>{row.label}</strong> : row.label}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: row.bold ? 600 : 400, color: row.amount < 0 ? "#fa541c" : "#000" }}>
                    {row.amount < 0 ? `(${fmt(-row.amount)})` : fmt(row.amount)}
                  </td>
                </tr>
              ))}
              {deductionRows.length > 0 && (
                <>
                  <tr><td colSpan={2} style={{ padding: "8px 4px", fontWeight: 600, background: "#fafafa", fontSize: 12 }}>Less: Deductions (Chapter VI-A)</td></tr>
                  {deductionRows.map((row, i) => (
                    <tr key={`d${i}`} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "6px 4px", paddingLeft: 20, color: "#595959" }}>{row.label}</td>
                      <td style={{ padding: "6px 4px", textAlign: "right", color: "#fa541c" }}>({fmt(row.amount)})</td>
                    </tr>
                  ))}
                </>
              )}
              <tr style={{ background: "#e6f4ff", borderTop: "2px solid #1677ff" }}>
                <td style={{ padding: "8px 4px", fontWeight: 700 }}>Total Taxable Income</td>
                <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700, fontSize: 15, color: "#1677ff" }}>{fmt(s.taxableIncome)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* Tax computation & refund */}
        <Card
          variant="borderless"
          style={{ borderRadius: 10, marginBottom: 20, border: "1px solid #e8e8e8" }}
          title={<Space><BankOutlined /><span>Tax & Refund Summary</span></Space>}
          size="small"
        >
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {[
              { label: "Tax Payable",     value: s.totalTax,   color: "#fa541c" },
              { label: "TDS Deducted",    value: s.tdsDeducted, color: "#1677ff" },
              { label: isRefund ? "Refund Due" : "Balance Payable",
                value: isRefund ? s.refundDue : s.balPayable,
                color: isRefund ? "#52c41a" : "#fa541c" },
              { label: "Effective Rate",  value: `${s.effectiveRate}%`, color: "#722ed1", isText: true },
            ].map(({ label, value, color, isText }) => (
              <Col xs={12} sm={6} key={label}>
                <div style={{ textAlign: "center", padding: "12px 4px", borderRadius: 8, background: "#fafafa" }}>
                  <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color }}>
                    {isText ? value : fmt(value)}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
          {isRefund && s.bankLast4 && (
            <Alert
              type="success"
              showIcon
              message={`Refund of ${fmt(s.refundDue)} will be credited to your bank account ending ••••${s.bankLast4} (IFSC: ${s.bankIFSC})`}
              style={{ borderRadius: 8 }}
            />
          )}
        </Card>

        {/* Action buttons or confirm panel */}
        {!action ? (
          <Card variant="borderless" style={{ borderRadius: 10, border: "1px solid #e8e8e8", textAlign: "center" }}>
            <Paragraph style={{ marginBottom: 24 }}>
              Do you approve this ITR-1 filing to be submitted to the Income Tax Department on your behalf?
            </Paragraph>
            <Space size={16}>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={() => setAction("approve")}
                style={{ minWidth: 160 }}
              >
                Approve Filing
              </Button>
              <Button
                size="large"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setAction("reject")}
                style={{ minWidth: 160 }}
              >
                Request Changes
              </Button>
            </Space>
          </Card>
        ) : (
          <Card variant="borderless" style={{ borderRadius: 10, border: `2px solid ${action === "approve" ? "#52c41a" : "#ff4d4f"}` }}>
            {action === "approve" ? (
              <>
                <Title level={5} style={{ color: "#52c41a" }}>Confirm Approval</Title>
                <Paragraph>By clicking Confirm, you authorise your CA to file this ITR-1 return with the Income Tax Department on your behalf.</Paragraph>
              </>
            ) : (
              <>
                <Title level={5} style={{ color: "#ff4d4f" }}>Request Changes</Title>
                <Paragraph>Please briefly explain what needs to be corrected. Your CA will revise and re-submit for your approval.</Paragraph>
                <Input.TextArea
                  rows={3}
                  placeholder="e.g. The HRA amount is incorrect. It should be ₹1,20,000 not ₹90,000."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
              </>
            )}
            <Space>
              <Button
                type="primary"
                size="large"
                loading={submitting}
                danger={action === "reject"}
                icon={action === "approve" ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                onClick={handleRespond}
                disabled={action === "reject" && !comment.trim()}
              >
                {action === "approve" ? "Confirm Approval" : "Submit Change Request"}
              </Button>
              <Button size="large" onClick={() => setAction(null)}>Go Back</Button>
            </Space>
          </Card>
        )}

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            This is a secure approval link. Your data is encrypted and handled as per ITD guidelines.
          </Text>
        </div>
      </div>
    </div>
  );
}
