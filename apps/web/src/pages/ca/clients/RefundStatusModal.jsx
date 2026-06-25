import React from "react";
import { Modal, Row, Col, Card, Statistic, Progress, Alert, Descriptions, Timeline, Typography, Spin } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, BankOutlined, FileSearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const STAGE_ICONS = {
  SUBMITTED:         <FileSearchOutlined />,
  VERIFIED:          <CheckCircleOutlined />,
  PROCESSING:        <ClockCircleOutlined />,
  REFUND_DETERMINED: <BankOutlined />,
  REFUND_INITIATED:  <BankOutlined />,
  REFUND_PAID:       <CheckCircleOutlined />,
};

// Compact rendering of the same computeRefundStatus() shape RefundTracker.jsx
// renders full-page — reused here as a Modal so a CA can check refund status
// for a client's e-filed return without leaving ClientWorkspace.
export default function RefundStatusModal({ open, onClose, loading, status, clientName }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`Refund Status${clientName ? ` — ${clientName}` : ""}`}
      footer={null}
      width={560}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spin size="large" /></div>
      ) : !status ? (
        <Alert type="error" message="Could not load refund status. Please try again." showIcon style={{ borderRadius: 8 }} />
      ) : !status.applicable ? (
        <Alert
          type={status.totalTax !== undefined ? "info" : "warning"}
          message={status.message}
          showIcon
          style={{ borderRadius: 8 }}
        />
      ) : (
        <>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card variant="borderless" size="small" style={{ borderRadius: 10, textAlign: "center" }}>
                <Statistic
                  title="Refund Amount"
                  value={status.refundAmount}
                  formatter={(v) => fmt(v)}
                  valueStyle={{ color: "#52c41a", fontSize: 18 }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card variant="borderless" size="small" style={{ borderRadius: 10, textAlign: "center" }}>
                <Statistic
                  title="Progress"
                  value={status.progress}
                  suffix="%"
                  valueStyle={{ color: "#1677ff", fontSize: 18 }}
                />
                <Progress percent={status.progress} showInfo={false} strokeColor="#1677ff" style={{ marginTop: 6 }} />
              </Card>
            </Col>
          </Row>

          <Alert
            type="info"
            message={
              <Text>
                Currently at: <Text strong style={{ color: "#1677ff" }}>{status.currentStage.label}</Text>
                {status.nextStage && <Text type="secondary"> — Next: {status.nextStage.label}</Text>}
              </Text>
            }
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />

          <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Acknowledgement No"><Text strong>{status.acknowledgementNo}</Text></Descriptions.Item>
            <Descriptions.Item label="Filed On">
              {status.submittedAt ? new Date(status.submittedAt).toLocaleDateString("en-IN") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Estimated Credit Date">
              {status.estimatedCreditDate ? new Date(status.estimatedCreditDate).toLocaleDateString("en-IN") : "Already credited"}
            </Descriptions.Item>
          </Descriptions>

          <Timeline
            items={status.stages.map((stage) => {
              const stageIdx   = status.stages.findIndex((s) => s.code === stage.code);
              const currentIdx = status.stages.findIndex((s) => s.code === status.currentStage.code);
              const isDone     = stageIdx <= currentIdx;
              const isCurrent  = stage.code === status.currentStage.code;
              return {
                color: isDone ? "green" : "gray",
                dot: isCurrent ? <ClockCircleOutlined style={{ color: "#1677ff" }} /> : isDone ? STAGE_ICONS[stage.code] : undefined,
                children: (
                  <div>
                    <Text strong={isCurrent} style={{ color: isCurrent ? "#1677ff" : isDone ? "#52c41a" : "#8c8c8c", fontSize: 13 }}>
                      {stage.label}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>~{stage.days} days after filing</Text>
                  </div>
                ),
              };
            })}
          />
        </>
      )}
    </Modal>
  );
}
