import { money, type Money } from "./money";

export interface FxQuote {
  base: string;
  quote: string;
  rate: number;
  source: string;
  asOf: Date;
}

export interface CurrencyConversion {
  original: Money;
  normalized: Money;
  rate: number;
  source: string;
  asOf: Date;
}

export function convertWithQuote(
  original: Money,
  quote: FxQuote,
  target = "USD",
): CurrencyConversion {
  if (original.currency === target) {
    return {
      original,
      normalized: original,
      rate: 1,
      source: "identity",
      asOf: quote.asOf,
    };
  }
  if (quote.base !== original.currency || quote.quote !== target) {
    throw new Error(
      `FX quote ${quote.base}/${quote.quote} cannot convert ${original.currency} to ${target}`,
    );
  }
  if (!Number.isFinite(quote.rate) || quote.rate <= 0) {
    throw new Error("FX rate is missing or invalid");
  }
  const normalizedMinor = BigInt(Math.round(Number(original.amountMinor) * quote.rate));
  return {
    original,
    normalized: money(normalizedMinor, target),
    rate: quote.rate,
    source: quote.source,
    asOf: quote.asOf,
  };
}

export function requireUsdOrQuote(
  original: Money,
  quote: FxQuote | null,
): { ok: true; conversion: CurrencyConversion } | { ok: false; reason: string } {
  if (original.currency === "USD") {
    return {
      ok: true,
      conversion: {
        original,
        normalized: original,
        rate: 1,
        source: "identity",
        asOf: quote?.asOf ?? new Date(0),
      },
    };
  }
  if (!quote) {
    return {
      ok: false,
      reason: `Insufficient verified data: no exchange-rate source for ${original.currency} to USD`,
    };
  }
  try {
    return { ok: true, conversion: convertWithQuote(original, quote, "USD") };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Currency conversion failed",
    };
  }
}
