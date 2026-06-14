import React, { useState, useEffect } from "react";
import {
  Card, Select, Typography, Steps, Progress,
  Statistic, Row, Col, Alert, Tag, Empty,
  Spin, Descriptions, Timeline,
} from "antd";
import {
  CheckCircleOutlined, ClockCircleOutlined,
  BankOutlined, FileSearchOutlined,
} from "@ant-design/icons";
import { getMyFilings } from "../../services/filing.service.js";
import api from "../../services/api.js";

const { Title, Text } = Typography;
const { Option }      = Select;

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n || 0);

export default function RefundTracker() {
  const [filings, setFilings]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(true);

  useEffect(() => {
    getMyFilings()
      .then((res) => {
        const submitted = (res.data || []).filter((f) => f.status !== "draft");
        setFilings(submitted);
        if (submitted.length > 0) setSelected(submitted[0]._id);
      })
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api.get(`/filing/${selected}/refund`)
      .then((res) => setStatus(res.data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [selected]);

  const STAGE_ICONS = {
    SUBMITTED:         <FileSearchOutlined />,
    VERIFIED:          <CheckCircleOutlined />,
    PROCESSING:        <ClockCircleOutlined />,
    REFUND_DETERMINED: <BankOutlined />,
    REFUND_INITIATED:  <BankOutlined />,
    REFUND_PAID:       <CheckCircleOutlined />,
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BankOutlined style={{ fontSize: 28, color: "#1677ff" }} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Refund Tracker</Title>
          <Text type="secondary">Track your income tax refund status</Text>
        </div>
      </div>

      {/* Filing selector */}
      <Card bordered={false} style={{ borderRadius: 10, marginBottom: 16 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <Text strong>Select Filing:</Text>
          </Col>
          <Col flex={1}>
            {fetching ? (
              <Spin size="small" />
            ) : (
              <Select
                style={{ width: "100%", maxWidth: 400 }}
                value={selected}
                onChange={setSelected}
                placeholder="Select a submitted filing"
              >
                {filings.map((f) => (
                  <Option key={f._id} value={f._id}>
                    {f.itrType} — AY {f.assessmentYear} —{" "}
                    <Tag color="blue">{f.acknowledgementNo}</Tag>
                  </Option>
                ))}
              </Select>
            )}
          </Col>
        </Row>
      </Card>

      {loading && (
        <Card bordered={false} style={{ borderRadius: 10, textAlign: "center", padding: 40 }}>
          <Spin size="large" tip="Fetching refund status..." />
        </Card>
      )}

      {!loading && !fetching && filings.length === 0 && (
        <Card bordered={false} style={{ borderRadius: 10 }}>
          <Empty description="No submitted filings found. File an ITR first." />
        </Card>
      )}

      {!loading && status && (
        <>
          {!status.applicable ? (
            <Alert
              type={status.refundAmount === 0 ? "info" : "warning"}
              message={status.message}
              showIcon
              style={{ borderRadius: 8 }}
            />
          ) : (
            <>
              {/* Refund summary */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                  <Card bordered={false} style={{ borderRadius: 10, textAlign: "center" }}>
                    <Statistic
                      title="Refund Amount"
                      value={status.refundAmount}
                      prefix="₹"
                      formatter={(v) => Number(v).toLocaleString("en-IN")}
                      valueStyle={{ color: "#52c41a", fontSize: 24 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card bordered={false} style={{ borderRadius: 10, textAlign: "center" }}>
                    <Statistic
                      title="Processing Progress"
                      value={status.progress}
                      suffix="%"
                      valueStyle={{ color: "#1677ff", fontSize: 24 }}
                    />
                    <Progress
                      percent={status.progress}
                      showInfo={false}
                      strokeColor="#1677ff"
                      style={{ marginTop: 8 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card bordered={false} style={{ borderRadius: 10, textAlign: "center" }}>
                    <Statistic
                      title="Days Since Filing"
                      value={status.daysSinceSubmission}
                      suffix="days"
                      valueStyle={{ color: "#faad14", fontSize: 24 }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Current stage */}
              <Card
                bordered={false}
                style={{ borderRadius: 10, marginBottom: 16 }}
                title="Current Status"
              >
                <Alert
                  type="info"
                  message={
                    <Text>
                      Your refund is currently at:{" "}
                      <Text strong style={{ color: "#1677ff" }}>
                        {status.currentStage.label}
                      </Text>
                      {status.nextStage && (
                        <Text type="secondary">
                          {" "}— Next: {status.nextStage.label}
                        </Text>
                      )}
                    </Text>
                  }
                  showIcon
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />

                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="Acknowledgement No">
                    <Text strong>{status.acknowledgementNo}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Filed On">
                    {status.submittedAt
                      ? new Date(status.submittedAt).toLocaleDateString("en-IN")
                      : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Estimated Credit Date">
                    {status.estimatedCreditDate
                      ? new Date(status.estimatedCreditDate).toLocaleDateString("en-IN")
                      : "Already credited"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Refund Amount">
                    <Text strong style={{ color: "#52c41a" }}>
                      {fmt(status.refundAmount)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Stage timeline */}
              <Card
                bordered={false}
                style={{ borderRadius: 10 }}
                title="Processing Timeline"
              >
                <Timeline
                  items={status.stages.map((stage) => {
                    const stageIdx   = status.stages.findIndex((s) => s.code === stage.code);
                    const currentIdx = status.stages.findIndex(
                      (s) => s.code === status.currentStage.code
                    );
                    const isDone     = stageIdx <= currentIdx;
                    const isCurrent  = stage.code === status.currentStage.code;

                    return {
                      color:  isDone ? "green" : "gray",
                      dot:    isCurrent
                        ? <ClockCircleOutlined style={{ color: "#1677ff", fontSize: 16 }} />
                        : isDone
                          ? <CheckCircleOutlined style={{ color: "#52c41a" }} />
                          : undefined,
                      children: (
                        <div>
                          <Text
                            strong={isCurrent}
                            style={{ color: isCurrent ? "#1677ff" : isDone ? "#52c41a" : "#8c8c8c" }}
                          >
                            {stage.label}
                          </Text>
                          {isCurrent && (
                            <Tag color="processing" style={{ marginLeft: 8 }}>
                              Current
                            </Tag>
                          )}
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ~{stage.days} days after filing
                          </Text>
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
