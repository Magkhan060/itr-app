import CAClient from "./ca-client.model.js";
import Filing   from "../itr/filing.model.js";

export const listClients = async (caId) => {
  const clients = await CAClient.find({ caId, isActive: true }).sort({ fullName: 1 }).lean();

  // Attach latest filing status to each client
  const enriched = await Promise.all(
    clients.map(async (c) => {
      const filing = await Filing.findOne({ caClientId: c._id })
        .sort({ createdAt: -1 })
        .select("status approvalStatus itrType assessmentYear acknowledgementNo efilingStatus")
        .lean();
      return { ...c, latestFiling: filing || null };
    })
  );
  return enriched;
};

export const getClient = async (caId, clientId) => {
  const client = await CAClient.findOne({ _id: clientId, caId }).lean();
  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });

  const filings = await Filing.find({ caClientId: clientId })
    .sort({ createdAt: -1 })
    .select(
      "status approvalStatus approvalToken approvalSentAt approvalRespondedAt approvalComment " +
      "itrType assessmentYear acknowledgementNo efilingStatus itrVAckNo efiledAt submittedAt createdAt " +
      "itr1Data.grossSalary itr1Data.tdsDeducted itr1Data.taxComputation itr1Data.selectedRegime"
    )
    .lean();

  return { ...client, filings };
};

export const createClient = async (caId, data) => {
  const existing = await CAClient.findOne({ caId, pan: data.pan.toUpperCase() });
  if (existing) throw Object.assign(new Error("A client with this PAN already exists in your roster"), { status: 409 });

  return CAClient.create({ caId, ...data, pan: data.pan.toUpperCase() });
};

export const updateClient = async (caId, clientId, data) => {
  const client = await CAClient.findOneAndUpdate(
    { _id: clientId, caId },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });
  return client;
};

export const deleteClient = async (caId, clientId) => {
  const client = await CAClient.findOneAndUpdate(
    { _id: clientId, caId },
    { $set: { isActive: false } },
    { new: true }
  );
  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });
  return { deleted: true };
};
