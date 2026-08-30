export type CurrencyCode = string;

export interface Money {
  amountMinor: bigint;
  currency: CurrencyCode;
}

export const ZERO_USD: Money = { amountMinor: 0n, currency: "USD" };

export function money(amountMinor: bigint | number, currency: CurrencyCode = "USD"): Money {
  return { amountMinor: BigInt(amountMinor), currency };
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function sum(values: Money[], currency: CurrencyCode): Money {
  return values.reduce((acc, value) => add(acc, value), money(0, currency));
}

export function majorToMinor(major: number, currency: CurrencyCode = "USD"): Money {
  if (!Number.isFinite(major)) {
    throw new Error("Amount is not a finite number");
  }
  const minor = Math.round(major * 100);
  return money(minor, currency);
}

export function minorToMajorNumber(amountMinor: bigint): number {
  return Number(amountMinor) / 100;
}

export function formatMoney(
  value: Money | null | undefined,
  options?: { fallback?: string },
): string {
  if (!value || value.amountMinor === null || value.amountMinor === undefined) {
    return options?.fallback ?? "Insufficient verified data";
  }
  const sign = value.amountMinor < 0n ? "-" : "";
  const abs = value.amountMinor < 0n ? -value.amountMinor : value.amountMinor;
  const major = abs / 100n;
  const cents = abs % 100n;
  const grouped = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${value.currency} ${grouped}.${cents.toString().padStart(2, "0")}`;
}

export function formatSignedMoney(value: Money): {
  text: string;
  direction: "up" | "down" | "flat";
} {
  if (value.amountMinor > 0n) {
    return { text: `+${formatMoney(value)}`, direction: "up" };
  }
  if (value.amountMinor < 0n) {
    return { text: formatMoney(value), direction: "down" };
  }
  return { text: formatMoney(value), direction: "flat" };
}

export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

export function absMoney(value: Money): Money {
  return {
    amountMinor: value.amountMinor < 0n ? -value.amountMinor : value.amountMinor,
    currency: value.currency,
  };
}

export function percentageOf(part: Money, whole: Money): number | null {
  assertSameCurrency(part, whole);
  if (whole.amountMinor === 0n) return null;
  return Number((part.amountMinor * 10000n) / whole.amountMinor) / 100;
}
