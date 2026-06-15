import { extractPDFText } from "../../utils/pdf.util.js";

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
  const pattern = /([A-Z]{4}[0-9]{5}[A-Z])\s+([A-Z][^\n]{3,50})\s+([\d,]+)\s+([\d,]+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    entries.push({
      tan:          match[1].trim(),
      deductorName: match[2].trim(),
      amountPaid:   parseInt(match[3].replace(/,/g, ""), 10) || 0,
      tdsDeducted:  parseInt(match[4].replace(/,/g, ""), 10) || 0,
    });
  }
  return entries;
};

export const parseForm26AS = async (filePath) => {
  const text = await extractPDFText(filePath);

  console.log("[Form26AS Parser] Text sample:\n", text.substring(0, 800));

  const parsed = {
    pan: extractField(text, [
      /PAN[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
      /Permanent\s+Account\s+Number[:\s]+([A-Z]{5}[0-9]{4}[A-Z])/i,
    ]),

    assessmentYear: extractField(text, [
      /Assessment\s+Year[:\s]+(20\d{2}[-–]\d{2,4})/i,
    ]),

    totalTDSSalary: extractAmount(text, [
      /(?:Total\s+)?TDS\s+(?:on\s+)?Salary[^₹\n\d]*([\d,]+)/i,
      /Part\s+A[^₹\n\d]{0,80}([\d,]+)/i,
    ]),

    totalTDSOther: extractAmount(text, [
      /TDS\s+on\s+(?:other\s+)?(?:income|interest)[^₹\n\d]*([\d,]+)/i,
      /Part\s+B[^₹\n\d]{0,80}([\d,]+)/i,
    ]),

    advanceTaxPaid: extractAmount(text, [
      /Advance\s+Tax[^₹\n\d]*([\d,]+)/i,
      /Part\s+C[^₹\n\d]{0,80}([\d,]+)/i,
    ]),

    selfAssessmentTax: extractAmount(text, [
      /Self.Assessment\s+Tax[^₹\n\d]*([\d,]+)/i,
    ]),

    refundAmount: extractAmount(text, [
      /(?:Amount\s+of\s+)?Refund[^₹\n\d]*([\d,]+)/i,
    ]),

    tdsEntries: extractTDSEntries(text),
  };

  parsed.totalTaxCredit = parsed.totalTDSSalary + parsed.totalTDSOther +
                          parsed.advanceTaxPaid  + parsed.selfAssessmentTax;

  const filled        = Object.values(parsed).filter((v) => v && v !== 0).length;
  parsed.confidence   = Math.round((filled / Object.keys(parsed).length) * 100);
  parsed.rawTextSample = text.substring(0, 400);

  return parsed;
};

// Local helper (26AS doesn't need the full extractField from form16)
function extractField(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}
