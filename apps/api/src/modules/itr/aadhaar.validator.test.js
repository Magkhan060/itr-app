/**
 * Aadhaar Verhoeff checksum validator — unit tests.
 * "234123412346" is a hand-verified Verhoeff-valid 12-digit string (not a real Aadhaar number).
 */

import { describe, it, expect } from "vitest";
import { isValidAadhaarChecksum, AADHAAR_REGEX } from "@itr-app/shared-types";

const VALID_AADHAAR = "234123412346";

describe("AADHAAR_REGEX", () => {
  it("matches exactly 12 digits", () => {
    expect(AADHAAR_REGEX.test(VALID_AADHAAR)).toBe(true);
  });

  it("rejects non-12-digit strings", () => {
    expect(AADHAAR_REGEX.test("12345")).toBe(false);
    expect(AADHAAR_REGEX.test("1234567890123")).toBe(false);
  });
});

describe("isValidAadhaarChecksum", () => {
  it("accepts a Verhoeff-valid 12-digit number", () => {
    expect(isValidAadhaarChecksum(VALID_AADHAAR)).toBe(true);
  });

  it("rejects when the check digit is altered", () => {
    expect(isValidAadhaarChecksum("234123412340")).toBe(false);
    expect(isValidAadhaarChecksum("234123412341")).toBe(false);
  });

  it("rejects when any single interior digit is altered (Verhoeff detects all single-digit errors)", () => {
    // Flip each digit position (except the last, already covered above) and confirm failure
    for (let i = 0; i < VALID_AADHAAR.length - 1; i++) {
      const chars = VALID_AADHAAR.split("");
      chars[i] = String((Number(chars[i]) + 1) % 10);
      expect(isValidAadhaarChecksum(chars.join(""))).toBe(false);
    }
  });

  it("rejects adjacent digit transpositions (Verhoeff detects these too)", () => {
    const chars = VALID_AADHAAR.split("");
    [chars[0], chars[1]] = [chars[1], chars[0]];
    const transposed = chars.join("");
    if (transposed !== VALID_AADHAAR) {
      expect(isValidAadhaarChecksum(transposed)).toBe(false);
    }
  });

  it("rejects strings that aren't exactly 12 digits", () => {
    expect(isValidAadhaarChecksum("12345")).toBe(false);
    expect(isValidAadhaarChecksum("12345678901234")).toBe(false);
    expect(isValidAadhaarChecksum("abcd1234efgh")).toBe(false);
    expect(isValidAadhaarChecksum("")).toBe(false);
  });
});
