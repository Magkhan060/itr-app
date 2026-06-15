import axios from "axios";
import crypto from "crypto";
import { env } from "../../config/env.js";
import Filing from "../itr/filing.model.js";
import { decrypt } from "../../utils/encryption.js";
import { generateITR1XML } from "./xml-generator.js";

// Live mode requires both ITD_API_BASE_URL and ITD_API_KEY in env.
const MOCK_MODE = !env.itdApiBaseUrl || !env.itdApiKey;

const itdHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key":    env.itdApiKey,
});

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

  // Decrypt bank account before generating XML
  const raw      = filing.toObject();
  const itr1Data = { ...raw.itr1Data };
  if (itr1Data.bankAccountEncrypted) {
    itr1Data.bankAccountNo = decrypt(itr1Data.bankAccountEncrypted);
    delete itr1Data.bankAccountEncrypted;
  }
  const xmlFiling = { ...raw, itr1Data };

  const xml      = generateITR1XML(xmlFiling);
  let   itrVAckNo;

  if (MOCK_MODE) {
    // Simulate a short processing delay that ITD would normally take
    itrVAckNo = `${filing.assessmentYear.replace("-", "")}${filing.itr1Data.pan}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  } else {
    const res = await axios.post(
      `${env.itdApiBaseUrl}/oas/efilingapi/EF/submitReturn`,
      { returnXML: xml, evc, pan: filing.itr1Data.pan },
      { headers: itdHeaders() }
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

  return { itrVAckNo, mockMode: MOCK_MODE };
};

// ── Download ITR XML (for the user's records) ────────────────────────────────

export const getITRXML = async (userId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, userId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });

  const raw      = filing.toObject();
  const itr1Data = { ...raw.itr1Data };
  if (itr1Data.bankAccountEncrypted) {
    itr1Data.bankAccountNo = decrypt(itr1Data.bankAccountEncrypted);
    delete itr1Data.bankAccountEncrypted;
  }

  return generateITR1XML({ ...raw, itr1Data });
};
