import User from "../auth/auth.model.js";
import Filing from "../itr/filing.model.js";
import { decrypt } from "../../utils/encryption.js";
import { generateITR1XML, generateITR2XML } from "../efiling/xml-generator.js";
import { computeRefundStatus } from "../itr/refund.service.js";

const generateXML = (filing) =>
  filing.itrType === "ITR-2" ? generateITR2XML(filing) : generateITR1XML(filing);

// Resolves the CAClient a logged-in taxpayer is linked to, or throws 403 if
// this account was never invited to a CA's Client Portal. This is the
// equivalent of resolveOwnerUserId() on the CA side, but for the read-only
// client-portal surface: filings prepared by a CA are owned by
// Filing.userId = <the CA>, not the client, so every query here goes through
// Filing.caClientId instead.
export const getLinkedClientId = async (userId) => {
  const user = await User.findById(userId).select("linkedCAClientId").lean();
  if (!user?.linkedCAClientId) {
    throw Object.assign(new Error("This account is not linked to a CA's client portal"), { status: 403 });
  }
  return user.linkedCAClientId;
};

export const getPortalFilings = async (userId) => {
  const linkedClientId = await getLinkedClientId(userId);
  return Filing.find({ caClientId: linkedClientId })
    .sort({ createdAt: -1 })
    .select(
      "status approvalStatus itrType assessmentYear acknowledgementNo " +
      "efilingStatus itrVAckNo submittedAt createdAt " +
      "itr1Data.grossSalary itr1Data.tdsDeducted itr1Data.taxComputation itr1Data.selectedRegime " +
      "itr2Data.grossSalary itr2Data.tdsDeducted itr2Data.taxComputation itr2Data.selectedRegime"
    )
    .lean();
};

const getOwnedFiling = async (userId, filingId) => {
  const linkedClientId = await getLinkedClientId(userId);
  const filing = await Filing.findOne({ _id: filingId, caClientId: linkedClientId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });
  return filing;
};

export const getPortalFilingById = async (userId, filingId) => {
  const filing = await getOwnedFiling(userId, filingId);
  return filing.toObject();
};

export const getPortalFilingXML = async (userId, filingId) => {
  const filing = await getOwnedFiling(userId, filingId);

  const raw       = filing.toObject();
  const dataField = raw.itrType === "ITR-2" ? "itr2Data" : "itr1Data";
  const data      = { ...raw[dataField] };
  if (data.bankAccountEncrypted) {
    data.bankAccountNo = decrypt(data.bankAccountEncrypted);
    delete data.bankAccountEncrypted;
  }
  if (data.aadhaarEncrypted) {
    data.aadhaar = decrypt(data.aadhaarEncrypted);
    delete data.aadhaarEncrypted;
  }

  return generateXML({ ...raw, [dataField]: data });
};

export const getPortalRefundStatus = async (userId, filingId) => {
  const filing = await getOwnedFiling(userId, filingId);
  return computeRefundStatus(filing);
};
