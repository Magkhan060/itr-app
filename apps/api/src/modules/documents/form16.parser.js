import { readFileSync } from "fs";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

// Disable worker for Node.js environment
GlobalWorkerOptions.workerSrc = "";

const extractPDFText = async (filePath) => {
  const data     = new Uint8Array(readFileSync(filePath));
  const loadTask = getDocument({ data, useWorkerFetch: false, isEvalSupported: false });
  const pdf      = await loadTask.promise;
  let fullText   = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText      += pageText + "\n";
  }

  return fullText;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const extractField = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
};

const extractAmount = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1].replace(/[,\s₹]/g, "");
      const num     = parseInt(cleaned, 10);
      if (!isNaN(num)) return num;
    }
  }
  return 0;
};

// ── Main Parser ────────────────────────────────────────────────────────────

export const parseForm16 = async (filePath) => {
  const raw = await extractPDFText(filePath);
  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  console.log("[Form16 Parser] Extracted text sample:\n", text.substring(0, 800));

  const parsed = {
    // ── Employer / Employee Identity ──────────────────
    employerName: extractField(text, [
      /Name\s+(?:and address\s+)?of\s+(?:the\s+)?Employer[:\s]+([A-Z][^\n]+)/i,
      /Employer['s]*\s+Name[:\s]+([A-Z][^\n]+)/i,
      /Deductor\s+Name[:\s]+([A-Z][^\n]+)/i,
    ]),

    employerTAN: extractField(text, [
      /TAN\s+of\s+(?:the\s+)?Deductor[:\s]+([A-Z]{4}[0-9]{5}[A-Z])/i,
      /Tax\s+Deduction\s+Account\s+No[.:\s]+([A-Z]{4}[0-9]{5}[A-Z])/i,
      /TAN[:\s]+([A-Z]{4}[0-9]{5}[A-Z])/i,
    ]),

    employeePAN: extractField(text, [
      /PAN\s+of\s+(?:the\s+)?Employee[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
      /Employee['s]*\s+PAN[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
      /PAN[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
    ]),

    employeeName: extractField(text, [
      /Name\s+of\s+(?:the\s+)?Employee[:\s]+([A-Z][^\n]+)/i,
      /Employee['s]*\s+Name[:\s]+([A-Z][^\n]+)/i,
    ]),

    financialYear: extractField(text, [
      /Financial\s+Year[:\s]+(20\d{2}[-–]\d{2,4})/i,
      /F\.?\s*Y\.?[:\s]+(20\d{2}[-–]\d{2,4})/i,
      /Assessment\s+Year[:\s]+(20\d{2}[-–]\d{2,4})/i,
    ]),

    // ── Income Figures ─────────────────────────────────
    grossSalary: extractAmount(text, [
      /Gross\s+Salary[^₹\d]*([\d,]+)/i,
      /(?:1\.|a\.)\s+Gross\s+Salary[^₹\d]*([\d,]+)/i,
      /Total\s+Gross\s+Salary[^₹\d]*([\d,]+)/i,
    ]),

    basicSalary: extractAmount(text, [
      /Basic\s+(?:Salary|Pay)[^₹\d]*([\d,]+)/i,
      /Basic\s+&\s+DA[^₹\d]*([\d,]+)/i,
      /Basic[^₹\d]*([\d,]+)/i,
    ]),

    hraReceived: extractAmount(text, [
      /House\s+Rent\s+Allowance[^₹\d]*([\d,]+)/i,
      /HRA\s+Received[^₹\d]*([\d,]+)/i,
      /HRA[^₹\d]*([\d,]+)/i,
    ]),

    hraExempt: extractAmount(text, [
      /(?:Exemption\s+u\/s\s+10(?:\(13A\))?|HRA\s+Exempt(?:ion)?)[^₹\d]*([\d,]+)/i,
      /10\(13A\)[^₹\d]*([\d,]+)/i,
      /House\s+Rent\s+Allowance\s+exempt[^₹\d]*([\d,]+)/i,
    ]),

    specialAllowance: extractAmount(text, [
      /Special\s+Allowance[^₹\d]*([\d,]+)/i,
      /Other\s+Allowance[^₹\d]*([\d,]+)/i,
    ]),

    bonus: extractAmount(text, [
      /Bonus[^₹\d]*([\d,]+)/i,
      /Performance\s+(?:Bonus|Pay)[^₹\d]*([\d,]+)/i,
    ]),

    lta: extractAmount(text, [
      /Leave\s+Travel\s+(?:Allowance|Concession)[^₹\d]*([\d,]+)/i,
      /LTA[^₹\d]*([\d,]+)/i,
      /10\(5\)[^₹\d]*([\d,]+)/i,
    ]),

    totalTaxableIncome: extractAmount(text, [
      /(?:Total\s+)?(?:Taxable\s+)?Income\s+(?:chargeable\s+)?(?:to\s+)?Tax[^₹\d]*([\d,]+)/i,
      /Income\s+Chargeable\s+under\s+the\s+head[^₹\d]*([\d,]+)/i,
      /Gross\s+Total\s+Income[^₹\d]*([\d,]+)/i,
    ]),

    // ── TDS ────────────────────────────────────────────
    tdsDeducted: extractAmount(text, [
      /Total\s+(?:Tax\s+)?(?:Amount\s+)?Deducted[^₹\d]*([\d,]+)/i,
      /Tax\s+Deducted\s+at\s+Source[^₹\d]*([\d,]+)/i,
      /TDS\s+Deducted[^₹\d]*([\d,]+)/i,
      /(?:Amount\s+of\s+)?Tax\s+Deducted[^₹\d]*([\d,]+)/i,
    ]),

    tdsDeposited: extractAmount(text, [
      /(?:Total\s+)?(?:Amount\s+of\s+)?Tax\s+Deposited[^₹\d]*([\d,]+)/i,
      /TDS\s+Deposited[^₹\d]*([\d,]+)/i,
    ]),

    // ── Deductions u/s VI-A ────────────────────────────
    pf: extractAmount(text, [
      /(?:Employees[']*\s+)?Provident\s+Fund[^₹\d]*([\d,]+)/i,
      /EPF[^₹\d]*([\d,]+)/i,
      /PF\s+Contribution[^₹\d]*([\d,]+)/i,
    ]),

    nps: extractAmount(text, [
      /(?:National\s+Pension|NPS)[^₹\d]*([\d,]+)/i,
      /80CCD[^₹\d]*([\d,]+)/i,
    ]),

    healthInsurance: extractAmount(text, [
      /(?:Health|Medical)\s+Insurance[^₹\d]*([\d,]+)/i,
      /80D[^₹\d]*([\d,]+)/i,
    ]),

    sec80C: extractAmount(text, [
      /(?:Deduction\s+u\/s\s+)?80C[^₹\d]*([\d,]+)/i,
      /Chapter\s+VI.?A.*?80C[^₹\d]*([\d,]+)/i,
    ]),

    professionalTax: extractAmount(text, [
      /Professional\s+Tax[^₹\d]*([\d,]+)/i,
      /16\(iii\)[^₹\d]*([\d,]+)/i,
    ]),

    standardDeduction: extractAmount(text, [
      /Standard\s+Deduction[^₹\d]*([\d,]+)/i,
      /16\(ia\)[^₹\d]*([\d,]+)/i,
    ]),
  };

  // ── Confidence Score ───────────────────────────────────────
  const coreFields    = ["employerName","employerTAN","employeePAN","grossSalary","tdsDeducted"];
  const coreFilled    = coreFields.filter((k) => parsed[k]).length;
  const allFilled     = Object.values(parsed).filter(Boolean).length;
  const allKeys       = Object.keys(parsed).length;

  parsed.confidence   = Math.round(
    (coreFilled / coreFields.length) * 60 +   // 60% weight on core fields
    (allFilled  / allKeys)           * 40      // 40% weight on all fields
  );

  parsed.rawTextSample = text.substring(0, 600);

  return parsed;
};
