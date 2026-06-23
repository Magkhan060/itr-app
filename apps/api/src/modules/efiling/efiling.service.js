import axios from "axios";
import crypto from "crypto";
import { env } from "../../config/env.js";
import Filing from "../itr/filing.model.js";
import User   from "../auth/auth.model.js";
import CAFirm from "../ca/ca-firm.model.js";
import { decrypt } from "../../utils/encryption.js";
import { generateITR1XML, generateITR2XML } from "./xml-generator.js";

// Platform-level mock mode — used by generateEVC / validateEVC.
// submitToITD resolves credentials per-filing (CA's own key first, then this fallback).
const MOCK_MODE = !env.itdApiBaseUrl || !env.itdApiKey;

const itdHeaders = (apiKey) => ({
  "Content-Type": "application/json",
  "x-api-key":    apiKey ?? env.itdApiKey,
});

// Decrypts whichever of itr1Data/itr2Data is present on a raw (toObject'd)
// filing and returns it alongside the field name it came from, so callers
// can both rebuild { ...raw, [dataField]: decrypted } and dispatch to the
// matching XML generator without duplicating the decrypt logic per type.
const decryptFilingDataField = (raw) => {
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
  return { dataField, data };
};

const generateXML = (filing) =>
  filing.itrType === "ITR-2" ? generateITR2XML(filing) : generateITR1XML(filing);

// ── Step 1: Generate EVC (send OTP to taxpayer's registered mobile) ──────────

export const generateEVC = async (pan, method) => {
  if (MOCK_MODE) {
    return {
      requestId: `MOCK-${Date.now()}`,
      message:   "OTP sent to Aadhaar-linked mobile (mock — use any 6-digit code)",
      mockMode:  true,
    };
  }

  const res = await axios.post(
    `${env.itdApiBaseUrl}/oas/efilingapi/EF/generateEVC`,
    { pan, evchMethod: method },
    { headers: itdHeaders() }
  );
  return res.data;
};

// ── Step 2: Validate OTP and obtain the EVC token ────────────────────────────

export const validateEVC = async (requestId, otp, pan) => {
  if (MOCK_MODE) {
    if (!/^\d{6}$/.test(otp)) throw Object.assign(new Error("OTP must be exactly 6 digits"), { status: 400 });
    return {
      evc:      `EVC${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      mockMode: true,
    };
  }

  const res = await axios.post(
    `${env.itdApiBaseUrl}/oas/efilingapi/EF/validateEVC`,
    { requestId, otp, pan },
    { headers: itdHeaders() }
  );
  return res.data;
};

// ── Step 3: Submit ITR XML + EVC to ITD portal ───────────────────────────────

export const submitToITD = async (userId, filingId, evc, evcMethod) => {
  const filing = await Filing.findOne({ _id: filingId, userId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });
  if (filing.status !== "submitted") {
    throw Object.assign(
      new Error("Filing must be in 'submitted' state before e-filing. Please complete the ITR form first."),
      { status: 400 }
    );
  }
  if (filing.efilingStatus === "submitted") {
    throw Object.assign(new Error("This return has already been e-filed"), { status: 409 });
  }

  // Resolve ITD credentials: CA's own key takes priority over the platform env.
  // This allows each CA firm to register as their own ERI/ASP with ITD.
  let effectiveBaseUrl = env.itdApiBaseUrl;
  let effectiveApiKey  = env.itdApiKey;
  let credentialSource = "platform";

  if (filing.preparedByCa) {
    const ca   = await User.findById(filing.preparedByCa).select("caFirmId").lean();
    const firm = ca?.caFirmId
      ? await CAFirm.findById(ca.caFirmId).select("itdApiBaseUrl itdApiKeyEncrypted").lean()
      : null;
    if (firm?.itdApiBaseUrl && firm?.itdApiKeyEncrypted) {
      effectiveBaseUrl = firm.itdApiBaseUrl;
      effectiveApiKey  = decrypt(firm.itdApiKeyEncrypted);
      credentialSource = "ca";
    }
  }

  const isMock = !effectiveBaseUrl || !effectiveApiKey;

  // Decrypt PII before generating XML
  const raw = filing.toObject();
  const { dataField, data } = decryptFilingDataField(raw);
  const xmlFiling = { ...raw, [dataField]: data };

  const xml = generateXML(xmlFiling);
  let   itrVAckNo;

  if (isMock) {
    itrVAckNo = `${filing.assessmentYear.replace("-", "")}${data.pan}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  } else {
    const res = await axios.post(
      `${effectiveBaseUrl}/oas/efilingapi/EF/submitReturn`,
      { returnXML: xml, evc, pan: data.pan },
      { headers: itdHeaders(effectiveApiKey) }
    );
    itrVAckNo = res.data?.acknowledgementNo;
    if (!itrVAckNo) throw new Error("ITD API did not return an acknowledgement number");
  }

  await Filing.findByIdAndUpdate(filingId, {
    $set: {
      status:        "verified",
      efilingStatus: "submitted",
      itrVAckNo,
      efiledAt:      new Date(),
      evcMethod,
    },
  });

  return { itrVAckNo, mockMode: isMock, credentialSource };
};

// ── Download ITR XML (for the user's records) ────────────────────────────────

export const getITRXML = async (userId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, userId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });

  const raw = filing.toObject();
  const { dataField, data } = decryptFilingDataField(raw);

  return generateXML({ ...raw, [dataField]: data });
};
