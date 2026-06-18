import React from "react";
import { Card } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import ClientForm from "./ClientForm.jsx";
import PageHeader from "../../../components/PageHeader.jsx";

export default function AddEditClient() {
  const { clientId } = useParams();
  const navigate      = useNavigate();
  const isEdit        = !!clientId;

  return (
    <div>
      <PageHeader
        onBack={() => navigate(-1)}
        title={isEdit ? "Edit Client" : "Add New Client"}
        subtitle="Client details will be used to pre-fill their ITR form"
      />

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
