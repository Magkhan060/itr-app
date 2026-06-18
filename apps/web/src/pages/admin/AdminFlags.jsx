import React, { useEffect, useState } from "react";
import {
  Table, Switch, Tag, Card, Typography, message,
  Space, Alert, Badge, Tooltip,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { getAllFlags, toggleFlag } from "../../services/admin.service.js";
import { useFlagsStore } from "../../store/index.js";

const { Text } = Typography;

const CATEGORY_LABELS = {
  itr_form:    { label: "ITR Form Types", color: "blue"   },
  sub_feature: { label: "Sub Features",   color: "green"  },
  integration: { label: "Integrations",   color: "purple" },
};

export default function AdminFlags() {
  const [flags, setFlags]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const setGlobalFlag = useFlagsStore((s) => s.setFlag);

  useEffect(() => {
    getAllFlags()
      .then((res) => setFlags(res.data || []))
      .catch((err) => message.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key, enabled) => {
    setToggling((prev) => ({ ...prev, [key]: true }));
    try {
      await toggleFlag(key, enabled);
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled } : f))
      );
      setGlobalFlag(key, enabled);  // propagate immediately — no page reload needed
      message.success(`${key} ${enabled ? "enabled" : "disabled"}`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setToggling((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Group flags by category
  const grouped = flags.reduce((acc, flag) => {
    const cat = flag.category || "sub_feature";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(flag);
    return acc;
  }, {});

  const columns = [
    {
      title:     "Flag Key",
      dataIndex: "key",
      key:       "key",
      render:    (k) => <Text code style={{ fontSize: 12 }}>{k}</Text>,
    },
    {
      title:     "Label",
      dataIndex: "label",
      key:       "label",
      render:    (l) => <Text strong>{l}</Text>,
    },
    {
      title:  "Status",
      key:    "status",
      render: (_, r) => (
        <Badge
          status={r.enabled ? "success" : "default"}
          text={r.enabled ? "Enabled" : "Disabled"}
        />
      ),
    },
    {
      title:  "Toggle",
      key:    "toggle",
      render: (_, r) => (
        <Switch
          checked={r.enabled}
          loading={!!toggling[r.key]}
          onChange={(checked) => handleToggle(r.key, checked)}
          checkedChildren="ON"
          unCheckedChildren="OFF"
        />
      ),
    },
    {
      title:  "Last Updated",
      dataIndex: "updatedAt",
      key:    "updated",
      render: (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—",
    },
  ];

  return (
    <>
      <Alert
        message={
          <Space>
            <InfoCircleOutlined />
            <Text>
              Changes take effect immediately across the app — sidebar navigation and
              quick actions update live. ITR form flags also gate the corresponding API routes.
            </Text>
          </Space>
        }
        type="warning"
        style={{ marginBottom: 16, borderRadius: 8 }}
      />

      {Object.entries(grouped).map(([category, categoryFlags]) => (
        <Card
          key={category}
          variant="borderless"
          style={{ borderRadius: 10, marginBottom: 16 }}
          title={
            <Space>
              <Tag color={CATEGORY_LABELS[category]?.color || "default"}>
                {CATEGORY_LABELS[category]?.label || category}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {categoryFlags.filter((f) => f.enabled).length} / {categoryFlags.length} enabled
              </Text>
            </Space>
          }
        >
          <Table
            dataSource={categoryFlags}
            columns={columns}
            rowKey="key"
            loading={loading}
            pagination={false}
            size="middle"
          />
        </Card>
      ))}
    </>
  );
}
