import { money, type Money } from "./money";
import { exclusionReasonForStatus, type CanonicalSaleStatus } from "./sale-status";

export interface SubjectVehicle {
  year: number;
  make: string;
  model: string;
  generation?: string | null;
  trim?: string | null;
  bodyStyle?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  mileage?: number | null;
  mileageUnit?: "MI" | "KM" | null;
  conditionGrade?: string | null;
  matchingNumbersStatus?: string | null;
  modifications?: string[] | null;
  titleStatus?: string | null;
  category?: string | null;
}

export interface ComparableCandidate {
  id: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  bodyStyle?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  mileage?: number | null;
  mileageUnit?: "MI" | "KM" | null;
  condition?: string | null;
  modifications?: string[] | null;
  knownDefects?: string[] | null;
  vin?: string | null;
  title?: string | null;
  saleStatus: CanonicalSaleStatus;
  saleDate?: Date | null;
  venue?: string | null;
  geography?: string | null;
  sourceUrl?: string | null;
  value: Money;
  dataCompleteness?: number;
}

export interface Adjustment {
  factor: string;
  amountMinor: bigint;
  justification: string;
}

export interface ScoredComparable {
  candidate: ComparableCandidate;
  included: boolean;
  similarityScore: number;
  inclusionReason: string;
  exclusionReason: string | null;
  differences: string[];
  adjustments: Adjustment[];
  rawValue: Money;
  adjustedValue: Money;
  weight: number;
  outlier: boolean;
}

export interface MethodologyConfig {
  version: string;
  minIncludedComparables: number;
  yearWindow: number;
  recencyHalfLifeDays: number;
  mileageAdjustmentPerMileMinor: number;
  projectPenaltyMinor: number;
  engineSwapPenaltyMinor: number;
  bodyStyleAdjustmentMinor: number;
  transmissionAdjustmentMinor: number;
  outlierIqrMultiplier: number;
}

export const DEFAULT_METHODOLOGY: MethodologyConfig = {
  version: "comps-v1.0.0",
  minIncludedComparables: 3,
  yearWindow: 3,
  recencyHalfLifeDays: 540,
  mileageAdjustmentPerMileMinor: 40,
  projectPenaltyMinor: 1500000,
  engineSwapPenaltyMinor: 800000,
  bodyStyleAdjustmentMinor: 800000,
  transmissionAdjustmentMinor: 600000,
  outlierIqrMultiplier: 1.5,
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function includesToken(haystack: string, needle: string): boolean {
  return haystack.includes(needle.toLowerCase());
}

function toMiles(
  mileage: number | null | undefined,
  unit: "MI" | "KM" | null | undefined,
): number | null {
  if (mileage === null || mileage === undefined) return null;
  if (unit === "KM") return Math.round(mileage * 0.621371);
  return mileage;
}

function similarity(
  subject: SubjectVehicle,
  candidate: ComparableCandidate,
): {
  score: number;
  differences: string[];
} {
  const differences: string[] = [];
  let score = 0;

  if (
    norm(candidate.make) !== norm(subject.make) ||
    norm(candidate.model) !== norm(subject.model)
  ) {
    return { score: 0, differences: ["Make or model does not match the subject vehicle."] };
  }

  const yearDelta =
    candidate.year === null || candidate.year === undefined
      ? 99
      : Math.abs(candidate.year - subject.year);
  score += Math.max(0, 20 - yearDelta * 5);
  if (yearDelta > 0 && candidate.year) {
    differences.push(`Model year ${candidate.year} vs subject ${subject.year}.`);
  }

  if (subject.trim && candidate.trim) {
    if (norm(candidate.trim) === norm(subject.trim)) score += 15;
    else differences.push(`Trim ${candidate.trim} vs subject ${subject.trim}.`);
  } else if (subject.trim && candidate.title && includesToken(candidate.title, subject.trim)) {
    score += 12;
  } else {
    score += 4;
    if (subject.trim) differences.push("Subject trim could not be confirmed on the comparable.");
  }

  if (subject.bodyStyle && candidate.bodyStyle) {
    if (norm(candidate.bodyStyle) === norm(subject.bodyStyle)) score += 10;
    else {
      score += 2;
      differences.push(`Body style ${candidate.bodyStyle} vs subject ${subject.bodyStyle}.`);
    }
  }

  if (subject.engine && candidate.engine) {
    if (
      norm(candidate.engine).includes(norm(subject.engine)) ||
      norm(subject.engine).includes(norm(candidate.engine))
    ) {
      score += 10;
    } else {
      differences.push(`Engine ${candidate.engine} vs subject ${subject.engine}.`);
    }
  }

  if (subject.transmission && candidate.transmission) {
    const sameManual =
      includesToken(subject.transmission, "manual") &&
      includesToken(candidate.transmission, "manual");
    const sameAuto =
      includesToken(subject.transmission, "auto") ||
      includesToken(subject.transmission, "sportomatic");
    if (norm(subject.transmission) === norm(candidate.transmission) || sameManual) score += 5;
    else if (sameAuto !== includesToken(candidate.transmission, "auto")) {
      differences.push(
        `Transmission ${candidate.transmission} vs subject ${subject.transmission}.`,
      );
    }
  }

  const subjectMiles = toMiles(subject.mileage, subject.mileageUnit);
  const candidateMiles = toMiles(candidate.mileage, candidate.mileageUnit);
  if (subjectMiles !== null && candidateMiles !== null) {
    const delta = Math.abs(subjectMiles - candidateMiles);
    score += Math.max(0, 15 - Math.floor(delta / 15000) * 3);
    if (delta > 5000) {
      differences.push(
        `Mileage ${candidateMiles.toLocaleString()} mi vs subject ${subjectMiles.toLocaleString()} mi.`,
      );
    }
  } else {
    differences.push("Mileage is incomplete on the subject or comparable.");
  }

  if (subject.conditionGrade && candidate.condition) {
    if (norm(subject.conditionGrade) === norm(candidate.condition)) score += 10;
    else differences.push(`Condition ${candidate.condition} vs subject ${subject.conditionGrade}.`);
  }

  const candidateMods = candidate.modifications ?? [];
  const subjectMods = subject.modifications ?? [];
  if (candidateMods.length !== subjectMods.length) {
    differences.push(
      `Modifications differ (${candidateMods.length} listed vs subject ${subjectMods.length}).`,
    );
  } else {
    score += 5;
  }

  if (candidate.knownDefects && candidate.knownDefects.length) {
    differences.push(`Known defects: ${candidate.knownDefects.slice(0, 3).join("; ")}.`);
  }

  return { score: Math.min(100, Math.max(0, score)), differences };
}

function buildAdjustments(
  subject: SubjectVehicle,
  candidate: ComparableCandidate,
  config: MethodologyConfig,
): Adjustment[] {
  const adjustments: Adjustment[] = [];
  const subjectMiles = toMiles(subject.mileage, subject.mileageUnit);
  const candidateMiles = toMiles(candidate.mileage, candidate.mileageUnit);
  if (subjectMiles !== null && candidateMiles !== null) {
    const delta = candidateMiles - subjectMiles;
    if (Math.abs(delta) >= 1000) {
      const amount = BigInt(Math.round(delta * config.mileageAdjustmentPerMileMinor));
      adjustments.push({
        factor: "mileage",
        amountMinor: amount,
        justification: `Adjusted ${delta > 0 ? "up" : "down"} because the comparable has ${Math.abs(delta).toLocaleString()} ${delta > 0 ? "more" : "fewer"} miles than the subject at ${config.mileageAdjustmentPerMileMinor} cents per mile.`,
      });
    }
  }

  const title =
    `${candidate.title ?? ""} ${(candidate.knownDefects ?? []).join(" ")}`.toLowerCase();
  if (title.includes("project") || title.includes("non-running") || title.includes("race car")) {
    adjustments.push({
      factor: "condition_project",
      amountMinor: BigInt(config.projectPenaltyMinor),
      justification:
        "Comparable appears to be a project, non-running, or purpose-built race car. Added back toward a complete driver-quality subject.",
    });
  }

  const mods = (candidate.modifications ?? []).join(" ").toLowerCase();
  if (mods.includes("engine swap") || mods.includes("powered") || title.includes("powered")) {
    adjustments.push({
      factor: "engine_swap",
      amountMinor: BigInt(-config.engineSwapPenaltyMinor),
      justification:
        "Comparable has a non-original or replacement engine. Adjusted toward a more original subject configuration.",
    });
  }

  if (
    subject.bodyStyle &&
    candidate.bodyStyle &&
    norm(subject.bodyStyle) !== norm(candidate.bodyStyle)
  ) {
    const targaVsCoupe =
      (includesToken(subject.bodyStyle, "targa") ||
        includesToken(subject.bodyStyle, "convertible")) !==
      (includesToken(candidate.bodyStyle, "targa") ||
        includesToken(candidate.bodyStyle, "convertible"));
    if (targaVsCoupe) {
      adjustments.push({
        factor: "body_style",
        amountMinor: BigInt(
          includesToken(subject.bodyStyle, "coupe")
            ? config.bodyStyleAdjustmentMinor
            : -config.bodyStyleAdjustmentMinor,
        ),
        justification: `Body style differs (${candidate.bodyStyle} vs ${subject.bodyStyle}). Adjustment is disclosed and configurable.`,
      });
    }
  }

  if (
    subject.transmission &&
    candidate.transmission &&
    includesToken(candidate.transmission, "automatic") &&
    includesToken(subject.transmission, "manual")
  ) {
    adjustments.push({
      factor: "transmission",
      amountMinor: BigInt(config.transmissionAdjustmentMinor),
      justification:
        "Comparable has an automatic or Sportomatic gearbox versus a manual subject. Adjustment is disclosed and configurable.",
    });
  }

  return adjustments;
}

function recencyWeight(
  saleDate: Date | null | undefined,
  asOf: Date,
  halfLifeDays: number,
): number {
  if (!saleDate) return 0.45;
  const days = Math.max(0, (asOf.getTime() - saleDate.getTime()) / (24 * 60 * 60 * 1000));
  return 1 / (1 + days / halfLifeDays);
}

function completeness(candidate: ComparableCandidate): number {
  if (candidate.dataCompleteness !== undefined) return candidate.dataCompleteness;
  const fields = [
    candidate.year,
    candidate.make,
    candidate.model,
    candidate.bodyStyle,
    candidate.engine,
    candidate.mileage,
    candidate.saleDate,
    candidate.sourceUrl,
    candidate.vin ?? null,
  ];
  const present = fields.filter(
    (value) => value !== null && value !== undefined && value !== "",
  ).length;
  return present / fields.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (!sorted.length) return 0;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];
  return sorted[low] * (high - index) + sorted[high] * (index - low);
}

export function scoreComparables(
  subject: SubjectVehicle,
  candidates: ComparableCandidate[],
  asOf: Date,
  config: MethodologyConfig = DEFAULT_METHODOLOGY,
): ScoredComparable[] {
  const scored: ScoredComparable[] = candidates.map((candidate) => {
    const statusReason = exclusionReasonForStatus(candidate.saleStatus);
    if (statusReason) {
      return {
        candidate,
        included: false,
        similarityScore: 0,
        inclusionReason: "",
        exclusionReason: statusReason,
        differences: [],
        adjustments: [],
        rawValue: candidate.value,
        adjustedValue: candidate.value,
        weight: 0,
        outlier: false,
      };
    }
    if (
      norm(candidate.make) !== norm(subject.make) ||
      norm(candidate.model) !== norm(subject.model)
    ) {
      return {
        candidate,
        included: false,
        similarityScore: 0,
        inclusionReason: "",
        exclusionReason:
          "Make or model does not match the subject. Evidence is retained but not weighted.",
        differences: ["Make or model mismatch."],
        adjustments: [],
        rawValue: candidate.value,
        adjustedValue: candidate.value,
        weight: 0,
        outlier: false,
      };
    }
    const yearDelta =
      candidate.year === null || candidate.year === undefined
        ? 99
        : Math.abs(candidate.year - subject.year);
    if (yearDelta > config.yearWindow) {
      return {
        candidate,
        included: false,
        similarityScore: 0,
        inclusionReason: "",
        exclusionReason: `Model year is outside the configured ${config.yearWindow}-year window.`,
        differences: [`Year ${candidate.year} vs ${subject.year}.`],
        adjustments: [],
        rawValue: candidate.value,
        adjustedValue: candidate.value,
        weight: 0,
        outlier: false,
      };
    }

    const { score, differences } = similarity(subject, candidate);
    const adjustments = buildAdjustments(subject, candidate, config);
    const adjustedMinor =
      candidate.value.amountMinor + adjustments.reduce((acc, item) => acc + item.amountMinor, 0n);
    const weight =
      (score / 100) *
      recencyWeight(candidate.saleDate, asOf, config.recencyHalfLifeDays) *
      (0.5 + 0.5 * completeness(candidate));

    return {
      candidate,
      included: score >= 25,
      similarityScore: score,
      inclusionReason:
        score >= 25
          ? `Included as a completed ${candidate.venue ?? "market"} sale with similarity ${score.toFixed(0)}/100.`
          : "",
      exclusionReason:
        score >= 25 ? null : "Similarity is below the minimum inclusion threshold of 25.",
      differences,
      adjustments,
      rawValue: candidate.value,
      adjustedValue: money(adjustedMinor, candidate.value.currency),
      weight,
      outlier: false,
    };
  });

  const includedValues = scored
    .filter((item) => item.included)
    .map((item) => Number(item.adjustedValue.amountMinor));
  if (includedValues.length >= 4) {
    const q1 = percentile(includedValues, 0.25);
    const q3 = percentile(includedValues, 0.75);
    const iqr = q3 - q1;
    const low = q1 - config.outlierIqrMultiplier * iqr;
    const high = q3 + config.outlierIqrMultiplier * iqr;
    for (const item of scored) {
      if (!item.included) continue;
      const value = Number(item.adjustedValue.amountMinor);
      if (value < low || value > high) {
        item.outlier = true;
        item.included = false;
        item.weight = 0;
        item.exclusionReason = `Statistical outlier versus the interquartile range of adjusted comparable values. Evidence is retained and not silently discarded.`;
      }
    }
  }

  return scored;
}

export function reconcileComparables(
  scored: ScoredComparable[],
  currency: string,
  config: MethodologyConfig = DEFAULT_METHODOLOGY,
): {
  estimate: Money | null;
  rangeLow: Money | null;
  rangeHigh: Money | null;
  confidence: "low" | "moderate" | "high" | null;
  confidenceNote: string;
  insufficientReason: string | null;
} {
  const included = scored.filter((item) => item.included && item.weight > 0);
  if (included.length < config.minIncludedComparables) {
    return {
      estimate: null,
      rangeLow: null,
      rangeHigh: null,
      confidence: null,
      confidenceNote: "",
      insufficientReason: `Insufficient verified data: ${included.length} included completed sales after documented exclusions; ${config.minIncludedComparables} are required by ${config.version}.`,
    };
  }

  const weighted = included.flatMap((item) => {
    const repeats = Math.max(1, Math.round(item.weight * 20));
    return Array.from({ length: repeats }, () => Number(item.adjustedValue.amountMinor));
  });
  const estimateMinor = BigInt(Math.round(median(weighted)));
  const lows = included.map((item) => Number(item.adjustedValue.amountMinor));
  const rangeLow = BigInt(Math.round(percentile(lows, 0.25)));
  const rangeHigh = BigInt(Math.round(percentile(lows, 0.75)));
  const avgSimilarity =
    included.reduce((acc, item) => acc + item.similarityScore, 0) / included.length;
  const confidence =
    included.length >= 8 && avgSimilarity >= 60
      ? "high"
      : included.length >= 5 && avgSimilarity >= 45
        ? "moderate"
        : "low";

  return {
    estimate: money(estimateMinor, currency),
    rangeLow: money(rangeLow, currency),
    rangeHigh: money(rangeHigh, currency),
    confidence,
    confidenceNote: `Weighted-median reconciliation of ${included.length} completed sales using ${config.version}. Confidence reflects sample size and average similarity (${avgSimilarity.toFixed(0)}/100), not a guarantee of future price.`,
    insufficientReason: null,
  };
}
