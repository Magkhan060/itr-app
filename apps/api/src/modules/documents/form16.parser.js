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

  // TRACES Form 16 PDFs have two distinct layouts:
  //   Part B (pages 3-6)  — rows like "House rent allowance under section 10(13A) 0.00"
  //   Annexure (page 7+)  — clean rows like "House Rent Allowance 702,325"
  //
  // Using [^₹\n\d]* between a label and its amount is too permissive: it lets
  // "under section 10(13A)" slip through, so the regex captures "10" instead of
  // the actual amount.  The fix:
  //   1. Search salary components only in the Annexure section (no ambiguous labels).
  //   2. Use \s+ instead of [^₹\n\d]* so the first non-whitespace char must be a digit.
  const annexureIdx = text.search(/Form\s+No\.?\s*16\s*[-.\s]+Annexure|Salary\s+Break(?:up|down)/i);
  const salaryText  = annexureIdx >= 0 ? text.slice(annexureIdx) : text;

  const parsed = {
    // ── Identity ───────────────────────────────────────────
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
      // TRACES uses "Name and address of the Employee" — mirror the employer pattern
      /Name\s+(?:and\s+(?:address|designation)\s+)?of\s+(?:the\s+)?Employee[:\s]+([A-Z][^\n]{2,60})/i,
      /Employee['s]*\s+Name[:\s]+([A-Z][^\n]{2,60})/i,
    ]),

    financialYear: extractField(text, [
      /Financial\s+Year[:\s]+(20\d{2}[-–]\d{2,4})/i,
      /F\.?\s*Y\.?[:\s]+(20\d{2}[-–]\d{2,4})/i,
    ]),

    // ── Income ─────────────────────────────────────────────
    grossSalary: extractAmount(text, [
      // TRACES Part B row 1(a): full legal label includes "of the Income-tax Act, 1961"
      // between "17(1)" and the amount, so make that suffix optional.
      /Salary\s+as\s+per\s+provisions\s+contained\s+in\s+section\s+17\s*\(1\)(?:\s+of\s+the\s+Income-tax\s+Act,?\s*1961)?\s+([\d,]+)/i,
      // Simpler / non-TRACES formats
      /(?:1\.|a\.)\s*Gross\s+Salary\s+([\d,]+)/i,
      /Gross\s+Salary\s+([\d,]+)/i,
      // NOTE: "Total (Rs.) X Y Z" from Part A is intentionally excluded — unpdf can
      // extract the TDS column before the salary column, causing it to capture TDS
      // (e.g. 756045) instead of gross salary (e.g. 3531553).
    ]),

    // Search in Annexure: clean "Basic Salary 1404649" without section refs
    basicSalary: extractAmount(salaryText, [
      /Basic\s+(?:Salary|Pay)\s+([\d,]+)/i,
      /Basic\s*&\s*DA\s+([\d,]+)/i,
    ]),

    // Search in Annexure only so "House rent allowance under section 10(13A)" in
    // Part B cannot capture "10" via [^₹\n\d]* absorbing "under section ".
    hraReceived: extractAmount(salaryText, [
      /House\s+Rent\s+Allowance\s+([\d,]+)/i,
      /HRA\s+Received\s+([\d,]+)/i,
      /\bHRA\b\s+([\d,]+)/i,
    ]),

    // \s+ prevents absorbing "(f) Other...section 10(14)" when Part B rows are
    // merged by unpdf, which previously caused "10" to be captured from "10(14)".
    hraExempt: extractAmount(text, [
      /10\s*\(13A\)\s+([\d,]+)/i,
      /HRA\s+Exempt(?:ion)?\s+([\d,]+)/i,
      /House\s+Rent\s+Allowance\s+exempt(?:ion)?\s+([\d,]+)/i,
    ]),

    specialAllowance: extractAmount(salaryText, [
      /Other\s+Allowance\s+([\d,]+)/i,       // TRACES Annexure label
      /Special\s+Allowance\s+([\d,]+)/i,
    ]),

    bonus: extractAmount(salaryText, [
      /Performance\s+(?:Bonus|Pay)\s+([\d,]+)/i,
      /Bonus\s+([\d,]+)/i,
    ]),

    lta: extractAmount(text, [
      /Leave\s+Travel\s+(?:Allowance|Concession)\s+([\d,]+)/i,
      /10\s*\(5\)\s+([\d,]+)/i,
      /\bLTA\b\s+([\d,]+)/i,
    ]),

    totalTaxableIncome: extractAmount(text, [
      // TRACES Part B row 12: "Total taxable income (9-11) 3456553"
      /Total\s+taxable\s+income\s*\([^)]+\)\s+([\d,]+)/i,
      // Simpler formats
      /Income\s+Chargeable\s+under\s+the\s+head\s+([\d,]+)/i,
      /Gross\s+Total\s+Income\s+([\d,]+)/i,
      /Total\s+Taxable\s+Income\s+([\d,]+)/i,
    ]),

    // ── TDS ────────────────────────────────────────────────
    tdsDeducted: extractAmount(text, [
      // TRACES Form 12BA: full label with section 192(1)
      /Tax\s+Deducted\s+from\s+salary\s+of\s+the\s+employee\s+under\s+section\s+192\s*\(1\)\s+([\d,]+)/i,
      // Simpler / test-fixture formats (colon or whitespace only between label and amount)
      /Tax\s+Deducted\s+from\s+salary[:\s]+([\d,]+)/i,
      /Amount\s+of\s+Tax\s+Deducted[:\s]+([\d,]+)/i,
    ]),

    // ── Deductions ─────────────────────────────────────────
    pf: extractAmount(salaryText, [
      /Employee\s+(?:['s\s]*)?Provident\s+Fund\s+([\d,]+)/i,
      /\bEPF\b\s+([\d,]+)/i,
    ]),

    // EPF (from Annexure) is the most common 80C vehicle.
    // "80C\b\s+" blocks "80C, 80CCC..." because "," is not whitespace,
    // preventing capture of "80" from "80CCC".
    sec80C: extractAmount(salaryText, [
      /Employee\s+(?:['s\s]*)?Provident\s+Fund\s+([\d,]+)/i,
      /\bEPF\b\s+([\d,]+)/i,
      /80C\b\s+([\d,]+)/i,
      /Deduction\s+u\/s\s+80C\s+([\d,]+)/i,
    ]),

    // \s+ blocks "Health Insurance premia under section 80D" from capturing "80":
    // after "Insurance " the next char is "p" (premia), not a digit → match fails.
    healthInsurance: extractAmount(text, [
      /(?:Health|Medical)\s+Insurance\s+([\d,]+)/i,
      /80D\b\s+([\d,]+)/i,
    ]),

    professionalTax: extractAmount(text, [
      /Professional\s+Tax\s+([\d,]+)/i,
      /16\s*\(iii\)\s+([\d,]+)/i,
    ]),

    standardDeduction: extractAmount(text, [
      /Standard\s+Deduction\s+([\d,]+)/i,
      /16\s*\(ia\)\s+([\d,]+)/i,
    ]),
  };

  // Derive grossSalary when direct extraction produced a suspect value.
  // TRACES Part A is a multi-column table; unpdf sometimes extracts the TDS column
  // before the salary column, so "Total (Rs.) 756045 3531553" gives 756045 instead
  // of 3531553.  The back-calculation below uses single-column Part B figures that
  // are not affected by column-ordering: grossSalary = taxableIncome + section16
  // deductions + section10 exemptions.
  const derivedGross =
    (parsed.totalTaxableIncome || 0) +
    (parsed.standardDeduction  || 0) +
    (parsed.hraExempt          || 0) +
    (parsed.professionalTax    || 0);

  if (derivedGross > 0 && derivedGross > Math.max(parsed.grossSalary, parsed.basicSalary || 0)) {
    parsed.grossSalary = derivedGross;
  }

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
