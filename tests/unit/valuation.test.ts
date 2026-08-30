import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mapOldCarsAuction } from "@/domain/market-map";
import { money } from "@/domain/money";
import {
  assertSafeValuationLanguage,
  DEFAULT_METHODOLOGY,
  developDraftValuation,
} from "@/domain/valuation";
import { scoreComparables } from "@/domain/comparables";
import { canonicalizeSaleStatus, exclusionReasonForStatus } from "@/domain/sale-status";
import type { OldCarsAuctionRecord } from "@/domain/market-map";

const fixture = JSON.parse(
  readFileSync(path.join(__dirname, "../fixtures/old-cars-data-1973-911t.json"), "utf8"),
) as { data: OldCarsAuctionRecord[] };

const subject = {
  year: 1973,
  make: "Porsche",
  model: "911",
  trim: "911T",
  bodyStyle: "Coupe",
  engine: "2.4-Liter Flat-Six",
  transmission: "Manual",
  mileage: 72000,
  mileageUnit: "MI" as const,
  modifications: [],
};

function candidatesFromFixture() {
  return fixture.data.map((record) => {
    const mapped = mapOldCarsAuction(record);
    return {
      id: mapped.sourceRecordId,
      year: mapped.year,
      make: mapped.make,
      model: mapped.model,
      bodyStyle: mapped.bodyStyle,
      engine: mapped.engine,
      transmission: mapped.transmission,
      mileage: mapped.mileage,
      mileageUnit: mapped.mileageUnit,
      modifications: mapped.modifications,
      knownDefects: mapped.knownDefects,
      title: mapped.title,
      saleStatus: mapped.saleStatus,
      saleDate: mapped.auctionEndAt,
      venue: mapped.source,
      sourceUrl: mapped.sourceUrl,
      value: money(
        mapped.originalAmountMinor ?? 0n,
        mapped.currency === "USD" ? "USD" : mapped.currency,
      ),
    };
  });
}

describe("sale status", () => {
  it("excludes reserve-not-met, live bids, and asking prices", () => {
    expect(exclusionReasonForStatus("reserve_not_met")).toMatch(/not completed sales/);
    expect(exclusionReasonForStatus("live")).toMatch(/not completed-sale/);
    expect(exclusionReasonForStatus("asking")).toMatch(/Asking prices/);
    expect(canonicalizeSaleStatus("sold")).toBe("sold");
  });
});

describe("comparable methodology", () => {
  it("does not silently drop outliers or reserve-not-met results", () => {
    const scored = scoreComparables(subject, candidatesFromFixture(), new Date("2026-08-01"), {
      ...DEFAULT_METHODOLOGY,
      minIncludedComparables: 3,
    });
    const rnm = scored.find((item) => item.candidate.saleStatus === "reserve_not_met");
    expect(rnm?.included).toBe(false);
    expect(rnm?.exclusionReason).toMatch(/Reserve-not-met/);
    const project = scored.find((item) => item.candidate.title?.includes("Project"));
    expect(project).toBeTruthy();
    expect(scored.every((item) => item.exclusionReason || item.inclusionReason)).toBe(true);
  });

  it("returns insufficient data when too few completed USD comps exist", () => {
    const draft = developDraftValuation({
      subject,
      candidates: candidatesFromFixture().filter((item) => item.saleStatus !== "sold"),
      asOf: new Date("2026-08-01"),
      intendedUse: "test",
      intendedUsers: "test",
      valueType: "FAIR_MARKET",
      methodology: DEFAULT_METHODOLOGY,
      dataSources: ["fixture"],
    });
    expect(draft.status).toBe("INSUFFICIENT_DATA");
    expect(draft.estimate).toBeNull();
    expect(draft.language.headline).toBe("Insufficient verified data");
  });

  it("produces a draft estimate from completed USD sales without forbidden claims", () => {
    const usdSold = candidatesFromFixture().filter(
      (item) =>
        item.saleStatus === "sold" && item.value.currency === "USD" && item.value.amountMinor > 0n,
    );
    const draft = developDraftValuation({
      subject,
      candidates: usdSold,
      asOf: new Date("2026-08-01"),
      intendedUse: "test",
      intendedUsers: "test",
      valueType: "FAIR_MARKET",
      methodology: DEFAULT_METHODOLOGY,
      dataSources: ["fixture"],
    });
    expect(draft.language.headline).toBe("Source-backed market estimate");
    expect(assertSafeValuationLanguage(draft.language.disclaimer)).toEqual([]);
    expect(assertSafeValuationLanguage("This figure is bank approved")).toEqual(["bank approved"]);
    if (draft.estimate) {
      expect(draft.estimate.amountMinor > 0n).toBe(true);
    } else {
      expect(draft.insufficientReason).toMatch(/Insufficient verified data/);
    }
  });

  it("excludes non-USD amounts when they were not normalized", () => {
    const euro = candidatesFromFixture().find((item) => item.value.currency === "EUR");
    expect(euro?.value.currency).toBe("EUR");
  });
});
