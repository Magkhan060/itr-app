import { extractPDFText } from "../../utils/pdf.util.js";

// ── Helpers ────────────────────────────────────────────────

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
      const num = parseInt(match[1].replace(/[,\s₹]/g, ""), 10);
      if (!isNaN(num)) return num;
    }
  }
  return 0;
};

// ── Main Parser ────────────────────────────────────────────

export const parseForm16 = async (filePath) => {
  const text = await extractPDFText(filePath);

  console.log("[Form16 Parser] Text sample:\n", text.substring(0, 800));

  const parsed = {
    // Identity
    employerName: extractField(text, [
      /Name\s+(?:and\s+address\s+)?of\s+(?:the\s+)?Employer[:\s]+([A-Z][^\n]{2,60})/i,
      /Employer['s]*\s+Name[:\s]+([A-Z][^\n]{2,60})/i,
      /Deductor\s+Name[:\s]+([A-Z][^\n]{2,60})/i,
    ]),

    employerTAN: extractField(text, [
      /TAN\s+of\s+(?:the\s+)?Deductor[:\s]+([A-Z]{4}[0-9]{5}[A-Z])/i,
      /Tax\s+Deduction\s+Account\s+No[.:\s]+([A-Z]{4}[0-9]{5}[A-Z])/i,
      /\b([A-Z]{4}[0-9]{5}[A-Z])\b/,
    ]),

    employeePAN: extractField(text, [
      /PAN\s+of\s+(?:the\s+)?Employee[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
      /Employee['s]*\s+PAN[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
    ]),

    employeeName: extractField(text, [
      /Name\s+of\s+(?:the\s+)?Employee[:\s]+([A-Z][^\n]{2,60})/i,
      /Employee['s]*\s+Name[:\s]+([A-Z][^\n]{2,60})/i,
    ]),

    financialYear: extractField(text, [
      /Financial\s+Year[:\s]+(20\d{2}[-–]\d{2,4})/i,
      /F\.?\s*Y\.?[:\s]+(20\d{2}[-–]\d{2,4})/i,
    ]),

    // Income
    grossSalary: extractAmount(text, [
      /Total\s+(?:amount\s+)?(?:of\s+)?(salary)[^₹\n\d]*([\d,]+)/i,      
      // /Salary\s+as\s+per\s+provisions\s+of\s+section\s+17\(\)\s*[:\s]+([\d,]+)/i,
      // /Gross\s+Salary[^₹\n\d]*([\d,]+)/i,
      /(?:1\.|a\.)\s*Gross\s+Salary[^₹\n\d]*([\d,]+)/i,
    ]),

    basicSalary: extractAmount(text, [
      /Basic\s+(?:Salary|Pay)[^₹\n\d]*([\d,]+)/i,
      /Basic\s*&\s*DA[^₹\n\d]*([\d,]+)/i,
    ]),

    hraReceived: extractAmount(text, [
      /House\s+Rent\s+Allowance[^₹\n\d]*([\d,]+)/i,
      /HRA\s+Received[^₹\n\d]*([\d,]+)/i,
      /\bHRA\b[^₹\n\d]*([\d,]+)/i,
    ]),

    hraExempt: extractAmount(text, [
      /10\(13A\)[^₹\n\d]*([\d,]+)/i,
      /HRA\s+Exempt(?:ion)?[^₹\n\d]*([\d,]+)/i,
      /House\s+Rent\s+Allowance\s+exempt[^₹\n\d]*([\d,]+)/i,
    ]),

    specialAllowance: extractAmount(text, [
      /Special\s+Allowance[^₹\n\d]*([\d,]+)/i,
      /Other\s+Allowance[^₹\n\d]*([\d,]+)/i,
    ]),

    bonus: extractAmount(text, [
      /Bonus[^₹\n\d]*([\d,]+)/i,
      /Performance\s+(?:Bonus|Pay)[^₹\n\d]*([\d,]+)/i,
    ]),

    lta: extractAmount(text, [
      /Leave\s+Travel\s+(?:Allowance|Concession)[^₹\n\d]*([\d,]+)/i,
      /10\(5\)[^₹\n\d]*([\d,]+)/i,
      /\bLTA\b[^₹\n\d]*([\d,]+)/i,
    ]),

    totalTaxableIncome: extractAmount(text, [
      /Income\s+Chargeable\s+under\s+the\s+head[^₹\n\d]*([\d,]+)/i,
      /Gross\s+Total\s+Income[^₹\n\d]*([\d,]+)/i,
      /Total\s+Taxable\s+Income[^₹\n\d]*([\d,]+)/i,
    ]),

    // TDS
    tdsDeducted: extractAmount(text, [
      /Total\s+(?:tax\s+)?(?:paid)[^₹\n\d]*([\d,]+)/i,      
      /Tax\s+Deducted\s+from\s+salary[^₹\n\d]*([\d,]+)/i,
      /Amount\s+of\s+Tax\s+Deducted[^₹\n\d]*([\d,]+)/i,
    ]),

    // Deductions
    pf: extractAmount(text, [
      /(?:Employees[']*\s+)?Provident\s+Fund[^₹\n\d]*([\d,]+)/i,
      /\bEPF\b[^₹\n\d]*([\d,]+)/i,
    ]),

    sec80C: extractAmount(text, [
      /(?:Deduction\s+u\/s\s+)?80C\b[^₹\n\d]*([\d,]+)/i,
    ]),

    healthInsurance: extractAmount(text, [
      /(?:Health|Medical)\s+Insurance[^₹\n\d]*([\d,]+)/i,
      /80D\b[^₹\n\d]*([\d,]+)/i,
    ]),

    professionalTax: extractAmount(text, [
      /Professional\s+Tax[^₹\n\d]*([\d,]+)/i,
      /16\(iii\)[^₹\n\d]*([\d,]+)/i,
    ]),

    standardDeduction: extractAmount(text, [
      /Standard\s+Deduction[^₹\n\d]*([\d,]+)/i,
      /16\(ia\)[^₹\n\d]*([\d,]+)/i,
    ]),
  };

  // Weighted confidence — core fields matter more
  const coreFields   = ["employerTAN", "employeePAN", "grossSalary", "tdsDeducted"];
  const coreFilled   = coreFields.filter((k) => parsed[k]).length;
  const allFilled    = Object.values(parsed).filter(Boolean).length;

  parsed.confidence  = Math.round(
    (coreFilled / coreFields.length) * 60 +
    (allFilled  / Object.keys(parsed).length) * 40
  );
  parsed.rawTextSample = text.substring(0, 600);

  return parsed;
};
