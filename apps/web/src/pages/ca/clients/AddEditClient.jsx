import React from "react";
import { Card, Button, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import ClientForm from "./ClientForm.jsx";

const { Title, Text } = Typography;

export default function AddEditClient() {
  const { clientId } = useParams();
  const navigate      = useNavigate();
  const isEdit        = !!clientId;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
        <div>
          <Title level={3} style={{ margin: 0 }}>{isEdit ? "Edit Client" : "Add New Client"}</Title>
          <Text type="secondary">Client details will be used to pre-fill their ITR form</Text>
        </div>
      </div>

      <Card variant="borderless" style={{ borderRadius: 10 }}>
        <ClientForm
          clientId={clientId}
          onSuccess={(client) => navigate(`/ca/clients/${client._id || clientId}`)}
          onCancel={() => navigate(-1)}
        />
      </Card>
    </div>
  );
}
