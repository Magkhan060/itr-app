import fs from "fs";
import { PDFParse } from "pdf-parse";

// === IMPROVED EXTRACTION (fixes the 192/10 problem) ===
const extractField = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return null;
};

const extractAmount = (text, patterns) => {
  const raw = extractField(text, patterns);
  if (!raw) return 0;

  let cleaned = raw.replace(/[,\s]/g, '');
  cleaned = cleaned.replace(/^[^\d]+/, '');   // strip section numbers like "192"

  const num = parseInt(cleaned, 10) || 0;
  return num;
};

export const parseForm16 = async (filePath) => {
  const buffer = fs.readFileSync(filePath);

  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();   // v3 ESM API
  const text = result.text;

  console.log("DEBUG - tdsDeducted raw:", extractAmount(text, [
      /Tax Deducted from salary of the employee under section 192\(1\).*?(\d[\d,]+)/i,
      /Tax Deducted.*?(\d[\d,]+)/i,
    ]));
  console.log("DEBUG - basicSalary raw:", extractAmount(text, [/Basic.*?(\d[\d,]+)/i, /Basic Salary.*?(\d[\d,]+)/i]));
console.log("DEBUG - hraReceived raw:", extractAmount(text, [/House rent allowance under section.*?(\d[\d,]+)/i]));

  const parsed = {
    employerName: extractField(text, [
      /Name of the Employer[:\s]+([A-Z][^\n]+)/i,
      /Employer Name[:\s]+([A-Z][^\n]+)/i,
    ]),
    employerTAN: extractField(text, [
      /TAN[:\s]+([A-Z]{4}[0-9]{5}[A-Z])/i,
      /Tax Deduction Account Number[:\s]+([A-Z]{4}[0-9]{5}[A-Z])/i,
    ]),
    employeePAN: extractField(text, [
      /PAN of Employee[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
      /Employee PAN[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
    ]),
    employeeName: extractField(text, [
      /Name of Employee[:\s]+([A-Z][^\n]+)/i,
      /Employee Name[:\s]+([A-Z][^\n]+)/i,
    ]),
    financialYear: extractField(text, [
      /Financial Year[:\s]+(20\d{2}-\d{2,4})/i,
      /F\.Y\.[:\s]+(20\d{2}-\d{2,4})/i,
    ]),

    // FIXED amount fields (now ignores section numbers)
    grossSalary:       extractAmount(text, [/Gross Salary.*?(\d[\d,]+)/i]),
    basicSalary:       extractAmount(text, [/Basic.*?(\d[\d,]+)/i, /Basic Salary.*?(\d[\d,]+)/i]),
    hraReceived:       extractAmount(text, [/House rent allowance under section.*?(\d[\d,]+)/i]),
    
    totalTaxableIncome:extractAmount(text, [/Total Taxable.*?(\d[\d,]+)/i, /Income Chargeable.*?(\d[\d,]+)/i]),
    // tdsDeducted:       extractAmount(text, [/Tax Deducted.*?(\d[\d,]+)/i, /TDS.*?(\d[\d,]+)/i, /Total TDS.*?(\d[\d,]+)/i]),
    tdsDeducted: extractAmount(text, [
      /Tax Deducted from salary of the employee under section 192\(1\).*?(\d[\d,]+)/i,
      /Tax Deducted.*?(\d[\d,]+)/i,
    ]),

    // Deductions
    pf:                extractAmount(text, [/Provident Fund.*?(\d[\d,]+)/i, /EPF.*?(\d[\d,]+)/i]),
    professionalTax:   extractAmount(text, [/Professional Tax.*?(\d[\d,]+)/i]),
  };

  // Cleanup
  await parser.destroy();

  // Stats
  const filled = Object.values(parsed).filter(Boolean).length;
  const total = Object.keys(parsed).length;
  parsed.confidence = Math.round((filled / total) * 100);
  parsed.rawText = text.substring(0, 500);

  return parsed;
};