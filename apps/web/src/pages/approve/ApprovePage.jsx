import React, { useEffect, useState } from "react";
import {
  Card, Button, Typography, Spin, Alert, Result,
  Descriptions, Statistic, Row, Col, Input, Space, Tag, Divider,
} from "antd";
import {
  CheckCircleOutlined, CloseCircleOutlined,
  SafetyCertificateOutlined, ExclamationCircleOutlined,
  FileDoneOutlined,
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
  const isRefund = s.refundDue > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "32px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
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
          description="Your Chartered Accountant has prepared your Income Tax Return. Please review the details carefully before approving."
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        {/* Tax summary card */}
        <Card variant="borderless" style={{ borderRadius: 10, marginBottom: 20, border: "1px solid #e8e8e8" }}>
          <Descriptions title={<Space><SafetyCertificateOutlined /><span>Tax Summary for {summary.client.fullName}</span></Space>} column={1} size="small" bordered>
            <Descriptions.Item label="PAN"><Text code>{summary.client.pan}</Text></Descriptions.Item>
            <Descriptions.Item label="Tax Regime">
              <Tag color={s.selectedRegime === "new" ? "blue" : "purple"}>
                {s.selectedRegime === "new" ? "New Tax Regime" : "Old Tax Regime"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Gross Salary">{fmt(s.grossSalary)}</Descriptions.Item>
            <Descriptions.Item label="Taxable Income">{fmt(s.taxableIncome)}</Descriptions.Item>
            <Descriptions.Item label="Total Tax Payable"><Text strong style={{ color: "#fa541c" }}>{fmt(s.totalTax)}</Text></Descriptions.Item>
            <Descriptions.Item label="TDS Already Deducted">{fmt(s.tdsDeducted)}</Descriptions.Item>
            <Descriptions.Item label={isRefund ? "Refund Due to You" : "Balance Tax Payable"}>
              <Text strong style={{ color: isRefund ? "#52c41a" : "#fa541c", fontSize: 16 }}>
                {fmt(isRefund ? s.refundDue : s.balPayable)}
              </Text>
              {isRefund && <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>(to be credited to your bank account)</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Effective Tax Rate">
              <Text strong>{s.effectiveRate}%</Text>
            </Descriptions.Item>
          </Descriptions>
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
