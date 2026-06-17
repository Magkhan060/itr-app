// Verhoeff checksum algorithm — the same checksum scheme UIDAI uses to generate
// the final digit of every Aadhaar number. Detects all single-digit errors and
// all transpositions of adjacent digits, unlike a plain modulo-10 checksum.

const D_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export const AADHAAR_REGEX = /^\d{12}$/;

/**
 * Validates a 12-digit Aadhaar number's Verhoeff check digit (the last digit).
 * Returns false for anything that isn't exactly 12 digits.
 */
export const isValidAadhaarChecksum = (aadhaar) => {
  if (!AADHAAR_REGEX.test(aadhaar)) return false;

  const digits = aadhaar.split("").map(Number).reverse();
  let checksum = 0;
  for (let i = 0; i < digits.length; i++) {
    checksum = D_TABLE[checksum][P_TABLE[i % 8][digits[i]]];
  }
  return checksum === 0;
};
