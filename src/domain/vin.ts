const TRANSLITERATION: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export type VinCheck =
  | {
      performed: true;
      outcome: "passed" | "failed";
      provider: "iso-3779-local";
      summary: string;
    }
  | {
      performed: false;
      outcome: "not_applicable" | "not_performed";
      provider: "none";
      summary: string;
    };

export function normalizeVin(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length ? cleaned : null;
}

export function validateVinCheckDigit(vin: string): VinCheck {
  const normalized = normalizeVin(vin);
  if (!normalized) {
    return {
      performed: false,
      outcome: "not_performed",
      provider: "none",
      summary: "No VIN or chassis number was provided.",
    };
  }
  if (normalized.length !== 17) {
    return {
      performed: false,
      outcome: "not_applicable",
      provider: "none",
      summary:
        "Check-digit validation applies to 17-character ISO 3779 VINs. Pre-1981 chassis numbers are recorded as-is and were not check-digit validated.",
    };
  }
  if (/[IOQ]/.test(normalized)) {
    return {
      performed: true,
      outcome: "failed",
      provider: "iso-3779-local",
      summary: "VIN contains I, O, or Q, which are not valid ISO 3779 characters.",
    };
  }

  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const char = normalized[i];
    const value = /[0-9]/.test(char) ? Number(char) : TRANSLITERATION[char];
    if (value === undefined) {
      return {
        performed: true,
        outcome: "failed",
        provider: "iso-3779-local",
        summary: `VIN contains an invalid character at position ${i + 1}.`,
      };
    }
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  const actual = normalized[8];
  if (actual === expected) {
    return {
      performed: true,
      outcome: "passed",
      provider: "iso-3779-local",
      summary: "ISO 3779 check digit matches.",
    };
  }
  return {
    performed: true,
    outcome: "failed",
    provider: "iso-3779-local",
    summary: `ISO 3779 check digit is ${actual}; expected ${expected}.`,
  };
}

export function makeModelConsistency(input: {
  vinYear?: number | null;
  statedYear: number;
  decodedMake?: string | null;
  statedMake: string;
  decodedModel?: string | null;
  statedModel: string;
}): { consistent: boolean; summary: string } {
  const issues: string[] = [];
  if (input.vinYear && input.vinYear !== input.statedYear) {
    issues.push(`decoded year ${input.vinYear} differs from stated year ${input.statedYear}`);
  }
  if (input.decodedMake && input.decodedMake.toLowerCase() !== input.statedMake.toLowerCase()) {
    issues.push(`decoded make ${input.decodedMake} differs from stated make ${input.statedMake}`);
  }
  if (input.decodedModel && input.decodedModel.toLowerCase() !== input.statedModel.toLowerCase()) {
    issues.push(
      `decoded model ${input.decodedModel} differs from stated model ${input.statedModel}`,
    );
  }
  if (!input.decodedMake && !input.decodedModel && !input.vinYear) {
    return {
      consistent: false,
      summary:
        "Manufacturer and model consistency was not checked because NHTSA did not return decoded identity fields.",
    };
  }
  return {
    consistent: issues.length === 0,
    summary: issues.length ? issues.join("; ") : "Stated identity matches decoder output.",
  };
}
