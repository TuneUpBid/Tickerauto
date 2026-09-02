import { money, type Money } from "./money";

export type PriceComposition =
  | {
      kind: "hammer_only";
      hammer: Money;
      premium: null;
      includesPremium: false;
    }
  | {
      kind: "hammer_and_premium";
      hammer: Money;
      premium: Money;
      includesPremium: true;
      total: Money;
    }
  | {
      kind: "total_includes_unknown_premium";
      total: Money;
      includesPremium: true;
      disclosure: string;
    }
  | {
      kind: "unknown";
      observed: Money;
      disclosure: string;
    };

export function classifySalePrice(input: {
  observed: Money;
  hammer?: Money | null;
  buyersPremium?: Money | null;
  includesPremium?: boolean | null;
  venueDefaultPremiumBps?: number | null;
}): PriceComposition {
  if (input.hammer && input.buyersPremium) {
    return {
      kind: "hammer_and_premium",
      hammer: input.hammer,
      premium: input.buyersPremium,
      includesPremium: true,
      total: money(
        input.hammer.amountMinor + input.buyersPremium.amountMinor,
        input.hammer.currency,
      ),
    };
  }
  if (input.hammer && !input.includesPremium) {
    return {
      kind: "hammer_only",
      hammer: input.hammer,
      premium: null,
      includesPremium: false,
    };
  }
  if (input.includesPremium === true && !input.buyersPremium) {
    return {
      kind: "total_includes_unknown_premium",
      total: input.observed,
      includesPremium: true,
      disclosure:
        "The observed amount includes buyer’s premium, but the premium was not separately disclosed. Hammer price is therefore unknown and is not inferred.",
    };
  }
  if (input.venueDefaultPremiumBps && input.includesPremium === true) {
    return {
      kind: "total_includes_unknown_premium",
      total: input.observed,
      includesPremium: true,
      disclosure:
        "A venue default buyer’s premium exists, but it was not applied. Hammer price is not inferred from a default rate.",
    };
  }
  return {
    kind: "unknown",
    observed: input.observed,
    disclosure:
      "Price composition is unknown. The observed amount is retained with provenance and is not labeled as a hammer price.",
  };
}

export function comparableValueFromComposition(composition: PriceComposition): {
  value: Money;
  label: string;
} {
  switch (composition.kind) {
    case "hammer_only":
      return { value: composition.hammer, label: "Hammer price" };
    case "hammer_and_premium":
      return { value: composition.total, label: "Hammer plus disclosed buyer’s premium" };
    case "total_includes_unknown_premium":
      return { value: composition.total, label: "Total including undisclosed buyer’s premium" };
    case "unknown":
      return { value: composition.observed, label: "Observed amount; composition unknown" };
  }
}
