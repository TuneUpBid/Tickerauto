import { describe, expect, it } from "vitest";
import { validateVinCheckDigit } from "@/domain/vin";
import { findDuplicateTransaction, uniqueTransactions } from "@/domain/duplicates";
import { classifySalePrice, comparableValueFromComposition } from "@/domain/premium";
import { majorToMinor } from "@/domain/money";

describe("VIN", () => {
  it("validates a known-good 17-character VIN check digit", () => {
    expect(validateVinCheckDigit("1HGCM82633A004352").outcome).toBe("passed");
  });
  it("fails a bad check digit", () => {
    expect(validateVinCheckDigit("1HGCM82633A004353").outcome).toBe("failed");
  });
  it("does not claim a check was performed for a pre-1981 chassis number", () => {
    const result = validateVinCheckDigit("9113102305");
    expect(result.performed).toBe(false);
    expect(result.outcome).toBe("not_applicable");
  });
});

describe("duplicates", () => {
  const base = {
    providerSlug: "old-cars-data",
    source: "bringatrailer",
    sourceRecordId: "2750831",
    sourceUrl: "https://bringatrailer.com/listing/1973-porsche-911t-coupe-55/",
    vin: "9113102305",
    auctionEndAt: "2026-07-05",
  };
  it("detects the same source record", () => {
    expect(findDuplicateTransaction(base, [base]).duplicate).toBe(true);
  });
  it("detects syndicated URL duplicates", () => {
    expect(
      findDuplicateTransaction(
        { ...base, sourceRecordId: "other", sourceUrl: `${base.sourceUrl}?utm_source=x` },
        [base],
      ).duplicate,
    ).toBe(true);
  });
  it("detects same VIN and sale date", () => {
    expect(
      findDuplicateTransaction({ ...base, source: "hemmings", sourceRecordId: "x" }, [base])
        .duplicate,
    ).toBe(true);
  });
  it("keeps distinct sales", () => {
    expect(
      uniqueTransactions([
        base,
        { ...base, sourceRecordId: "2", sourceUrl: "https://example.com/other", vin: "9113102047" },
      ]),
    ).toHaveLength(2);
  });
});

describe("buyer premium", () => {
  it("does not treat an inclusive total as a hammer price", () => {
    const classified = classifySalePrice({
      observed: majorToMinor(110000),
      includesPremium: true,
    });
    expect(classified.kind).toBe("total_includes_unknown_premium");
    expect(comparableValueFromComposition(classified).label).toMatch(/premium/i);
  });
  it("keeps hammer and premium separate when both are known", () => {
    const classified = classifySalePrice({
      observed: majorToMinor(110000),
      hammer: majorToMinor(100000),
      buyersPremium: majorToMinor(10000),
    });
    expect(classified.kind).toBe("hammer_and_premium");
    if (classified.kind === "hammer_and_premium") {
      expect(classified.total.amountMinor).toBe(11000000n);
    }
  });
});
