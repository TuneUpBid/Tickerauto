import { describe, expect, it } from "vitest";
import { add, formatMoney, majorToMinor, money, percentageOf } from "@/domain/money";
import { calculatePnl } from "@/domain/pnl";
import { moneyWeightedReturn, timeWeightedReturn } from "@/domain/returns";
import { convertWithQuote, requireUsdOrQuote } from "@/domain/currency";

describe("money", () => {
  it("adds same-currency amounts", () => {
    expect(add(money(199), money(1)).amountMinor).toBe(200n);
  });
  it("rejects currency mixing", () => {
    expect(() => add(money(1, "USD"), money(1, "EUR"))).toThrow(/Currency mismatch/);
  });
  it("formats and converts majors", () => {
    expect(formatMoney(majorToMinor(82500))).toBe("USD 82,500.00");
  });
  it("computes allocation percentages", () => {
    expect(percentageOf(money(2500), money(10000))).toBe(25);
  });
});

describe("currency", () => {
  it("converts with a documented quote", () => {
    const result = convertWithQuote(majorToMinor(100, "EUR"), {
      base: "EUR",
      quote: "USD",
      rate: 1.1,
      source: "test-fixture",
      asOf: new Date("2026-01-01"),
    });
    expect(result.normalized.amountMinor).toBe(11000n);
    expect(result.source).toBe("test-fixture");
  });
  it("refuses conversion without a quote", () => {
    const result = requireUsdOrQuote(majorToMinor(100, "EUR"), null);
    expect(result.ok).toBe(false);
  });
});

describe("pnl", () => {
  it("separates cost basis, operating expenses, and net economic return", () => {
    const result = calculatePnl({
      currency: "USD",
      acquisitionPrice: majorToMinor(80000),
      buyerFees: majorToMinor(2000),
      transportation: majorToMinor(1500),
      taxes: majorToMinor(500),
      capitalImprovements: majorToMinor(4000),
      maintenance: majorToMinor(1200),
      insurance: majorToMinor(800),
      otherOperating: majorToMinor(0),
      currentEstimatedValue: majorToMinor(91000),
      realizedProceeds: null,
      sellingFees: majorToMinor(0),
    });
    expect(result.costBasis.amountMinor).toBe(8800000n);
    expect(result.unrealizedGainLoss?.amountMinor).toBe(300000n);
    expect(result.grossAppreciation?.amountMinor).toBe(1100000n);
    expect(result.netEconomicReturn?.amountMinor).toBe(100000n);
    expect(result.labels.grossAppreciation).toMatch(/not profit/i);
  });
});

describe("returns", () => {
  it("calculates time-weighted return across two periods", () => {
    const result = timeWeightedReturn([
      { date: new Date("2024-01-01"), value: 100 },
      { date: new Date("2024-06-01"), value: 110, externalFlow: 0 },
      { date: new Date("2024-12-01"), value: 121, externalFlow: 0 },
    ]);
    expect(result.twr).toBeCloseTo(0.21, 5);
  });
  it("calculates money-weighted return for a simple buy and hold", () => {
    const result = moneyWeightedReturn([
      { date: new Date("2024-01-01"), amount: -100 },
      { date: new Date("2025-01-01"), amount: 110 },
    ]);
    expect(result.mwr).not.toBeNull();
    expect(result.mwr ?? 0).toBeGreaterThan(0.09);
    expect(result.mwr ?? 0).toBeLessThan(0.11);
  });
  it("does not invent a return from a single observation", () => {
    expect(timeWeightedReturn([{ date: new Date(), value: 1 }]).twr).toBeNull();
    expect(moneyWeightedReturn([{ date: new Date(), amount: -1 }]).mwr).toBeNull();
  });
});
