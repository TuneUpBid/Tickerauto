import {
  DEFAULT_METHODOLOGY,
  reconcileComparables,
  scoreComparables,
  type ComparableCandidate,
  type MethodologyConfig,
  type ScoredComparable,
  type SubjectVehicle,
} from "./comparables";
import type { Money } from "./money";

export const VALUE_LABELS = {
  FAIR_MARKET: "Fair market value",
  RETAIL_MARKET: "Retail market value",
  WHOLESALE: "Wholesale value",
  ORDERLY_LIQUIDATION: "Orderly liquidation value",
  FORCED_SALE: "Forced-sale value",
  INSURANCE_AGREED: "Insurance agreed value",
} as const;

export type ValueTypeKey = keyof typeof VALUE_LABELS;

export const STATUS_LABELS = {
  DRAFT: "Draft valuation",
  REVIEWED: "Reviewed draft valuation",
  CERTIFIED: "Independently appraised value",
  EXPIRED: "Expired valuation",
  SUPERSEDED: "Superseded valuation",
  INSUFFICIENT_DATA: "Insufficient verified data",
} as const;

export interface DraftValuationInput {
  subject: SubjectVehicle;
  candidates: ComparableCandidate[];
  asOf: Date;
  intendedUse: string;
  intendedUsers: string;
  valueType: ValueTypeKey;
  methodology: MethodologyConfig;
  dataSources: string[];
}

export interface DraftValuationResult {
  status: "DRAFT" | "INSUFFICIENT_DATA";
  freshness: "CURRENT" | "INSUFFICIENT";
  estimate: Money | null;
  rangeLow: Money | null;
  rangeHigh: Money | null;
  confidence: "low" | "moderate" | "high" | null;
  confidenceNote: string;
  insufficientReason: string | null;
  scored: ScoredComparable[];
  methodologyVersion: string;
  language: {
    headline: string;
    disclaimer: string;
  };
}

export function developDraftValuation(input: DraftValuationInput): DraftValuationResult {
  const scored = scoreComparables(input.subject, input.candidates, input.asOf, input.methodology);
  const reconciled = reconcileComparables(scored, "USD", input.methodology);
  const insufficient = Boolean(reconciled.insufficientReason);

  return {
    status: insufficient ? "INSUFFICIENT_DATA" : "DRAFT",
    freshness: insufficient ? "INSUFFICIENT" : "CURRENT",
    estimate: reconciled.estimate,
    rangeLow: reconciled.rangeLow,
    rangeHigh: reconciled.rangeHigh,
    confidence: reconciled.confidence,
    confidenceNote: reconciled.confidenceNote,
    insufficientReason: reconciled.insufficientReason,
    scored,
    methodologyVersion: input.methodology.version,
    language: {
      headline: insufficient ? "Insufficient verified data" : "Source-backed market estimate",
      disclaimer:
        "This figure is a source-backed market estimate produced by a documented comparable-sales methodology. It is a draft valuation, not an independently appraised value, not USPAP certified, not bank approved, and not a guarantee of future price. A valuation becomes an appraisal only after a qualified independent appraiser completes and signs it.",
    },
  };
}

export function staleIfOlderThan(effectiveOn: Date, asOf: Date, maxAgeDays: number): boolean {
  const ageDays = (asOf.getTime() - effectiveOn.getTime()) / (24 * 60 * 60 * 1000);
  return ageDays > maxAgeDays;
}

export function forbiddenValuationClaims(): string[] {
  return ["guaranteed", "100% accurate", "bank approved", "uspap certified"];
}

export function assertSafeValuationLanguage(text: string): string[] {
  const lower = text.toLowerCase();
  return forbiddenValuationClaims().filter((claim) => {
    let index = 0;
    while (index < lower.length) {
      const found = lower.indexOf(claim, index);
      if (found === -1) return false;
      const before = lower.slice(Math.max(0, found - 16), found);
      if (!/\bnot\s+$/.test(before) && !/\bnever\s+$/.test(before)) {
        return true;
      }
      index = found + claim.length;
    }
    return false;
  });
}

export { DEFAULT_METHODOLOGY };
export type { MethodologyConfig, SubjectVehicle, ComparableCandidate };
