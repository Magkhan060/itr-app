import { readFileSync } from "fs";
import { extractText } from "unpdf";

export const extractPDFText = async (filePath) => {
  const buffer = readFileSync(filePath);
  const uint8  = new Uint8Array(buffer);

  const { text } = await extractText(uint8, { mergePages: true });

  // Normalize whitespace — Form 16 / 26AS PDFs have irregular spacing
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
};
