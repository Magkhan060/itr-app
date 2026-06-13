import fs from "fs";

// For now, return a placeholder parser that can be enhanced later
// pdf-parse has complex CommonJS/ESM compatibility issues

export const parseForm16 = async (filePath) => {
  // TODO: Implement proper PDF parsing
  // pdf-parse has complex CommonJS/ESM module compatibility issues
  // For now, return a basic structure so uploads succeed
  
  const fileStats = fs.statSync(filePath);
  
  const parsed = {
    employerName: null,
    employerTAN: null,
    employeePAN: null,
    employeeName: null,
    financialYear: null,
    grossSalary: 0,
    basicSalary: 0,
    hraReceived: 0,
    totalTaxableIncome: 0,
    tdsDeducted: 0,
    pf: 0,
    professionalTax: 0,
    confidence: 0,
    rawText: "[PDF parsing not yet implemented - file uploaded successfully]",
    fileSizeBytes: fileStats.size,
  };

  return parsed;
};
