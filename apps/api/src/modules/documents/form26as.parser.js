import { readFileSync } from "fs";
import { createRequire } from "module";

const require   = createRequire(import.meta.url);
const pdfModule = require("pdf-parse");
const pdfParse  = typeof pdfModule === "function"
  ? pdfModule
  : pdfModule.default ?? pdfModule;

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

const extractTDSEntries = (text) => {
  const entries = [];

  // Match TDS deductor blocks — typical 26AS format
  const deductorPattern = /([A-Z]{4}[0-9]{5}[A-Z])\s+([A-Z][^\n]{3,40})\s+(\d[\d,]+)\s+(\d[\d,]+)/g;
  let match;

  while ((match = deductorPattern.exec(text)) !== null) {
    entries.push({
      tan:            match[1].trim(),
      deductorName:   match[2].trim(),
      amountPaid:     parseInt(match[3].replace(/,/g, ""), 10) || 0,
      tdsDeducted:    parseInt(match[4].replace(/,/g, ""), 10) || 0,
    });
  }

  return entries;
};

export const parseForm26AS = async (filePath) => {
  const buffer = readFileSync(filePath);
  const data   = await pdfParse(buffer);
  const raw    = data.text;

  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  const parsed = {
    pan: (text.match(/PAN[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i) || [])[1] || null,

    assessmentYear: (text.match(/Assessment\s+Year[:\s]+(20\d{2}-\d{2,4})/i) || [])[1] || null,

    // Part A — TDS on Salary
    totalTDSSalary: extractAmount(text, [
      /(?:Total\s+)?TDS\s+(?:on\s+)?Salary[^₹\d]*([\d,]+)/i,
      /Part\s+A[^₹\d]*([\d,]+)/i,
    ]),

    // Part B — TDS on other income
    totalTDSOther: extractAmount(text, [
      /TDS\s+on\s+(?:other\s+)?(?:income|interest)[^₹\d]*([\d,]+)/i,
      /Part\s+B[^₹\d]*([\d,]+)/i,
    ]),

    // Part C — Advance Tax / Self Assessment Tax
    advanceTaxPaid: extractAmount(text, [
      /Advance\s+Tax[^₹\d]*([\d,]+)/i,
      /Part\s+C[^₹\d]*([\d,]+)/i,
    ]),

    selfAssessmentTax: extractAmount(text, [
      /Self.Assessment\s+Tax[^₹\d]*([\d,]+)/i,
    ]),

    // Refund
    refundAmount: extractAmount(text, [
      /Refund[^₹\d]*([\d,]+)/i,
      /Amount\s+(?:of\s+)?Refund[^₹\d]*([\d,]+)/i,
    ]),

    tdsEntries: extractTDSEntries(text),
  };

  parsed.totalTaxCredit = parsed.totalTDSSalary + parsed.totalTDSOther +
                          parsed.advanceTaxPaid + parsed.selfAssessmentTax;

  const filled       = Object.values(parsed).filter((v) => v && v !== 0).length;
  parsed.confidence  = Math.round((filled / Object.keys(parsed).length) * 100);
  parsed.rawTextSample = text.substring(0, 400);

  return parsed;
};
