import type { SaleStatus } from "@prisma/client";
import { money } from "@/domain/money";
import {
  DEFAULT_METHODOLOGY,
  developDraftValuation,
  type ComparableCandidate,
} from "@/domain/valuation";
import { canonicalizeSaleStatus } from "@/domain/sale-status";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { canMutateCollection } from "../rbac";
import type { CurrentUser } from "../auth/session";
import { decodeNhtsaVin } from "../providers/nhtsa-vin";
import { refreshFromLiveProvider } from "./market";

function toCandidate(tx: {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyStyle: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  mileage: number | null;
  mileageUnit: "MI" | "KM" | null;
  condition: string | null;
  modifications: unknown;
  knownDefects: unknown;
  saleStatus: SaleStatus;
  auctionEndAt: Date | null;
  source: string;
  sourceUrl: string | null;
  normalizedUsdMinor: bigint | null;
  originalAmountMinor: bigint | null;
  currency: string;
}): ComparableCandidate | null {
  const status = canonicalizeSaleStatus(tx.saleStatus.replaceAll("_", " ").toLowerCase());
  if (!status) return null;
  const amount = tx.normalizedUsdMinor ?? (tx.currency === "USD" ? tx.originalAmountMinor : null);
  if (amount === null) return null;
  return {
    id: tx.id,
    year: tx.year,
    make: tx.make,
    model: tx.model,
    trim: tx.trim,
    bodyStyle: tx.bodyStyle,
    engine: tx.engine,
    transmission: tx.transmission,
    drivetrain: tx.drivetrain,
    mileage: tx.mileage,
    mileageUnit: tx.mileageUnit,
    condition: tx.condition,
    modifications: Array.isArray(tx.modifications) ? (tx.modifications as string[]) : [],
    knownDefects: Array.isArray(tx.knownDefects) ? (tx.knownDefects as string[]) : [],
    title: null,
    saleStatus: status,
    saleDate: tx.auctionEndAt,
    venue: tx.source,
    sourceUrl: tx.sourceUrl,
    value: money(amount, "USD"),
  };
}

export async function ensureDefaultMethodology() {
  return prisma.methodologyVersion.upsert({
    where: { slug_version: { slug: "comps-fmv", version: DEFAULT_METHODOLOGY.version } },
    create: {
      slug: "comps-fmv",
      version: DEFAULT_METHODOLOGY.version,
      name: "Comparable-sales fair market estimate",
      valueType: "FAIR_MARKET",
      description:
        "Versioned comparable-sales methodology. Produces a source-backed market estimate, not an independently appraised value.",
      config: DEFAULT_METHODOLOGY as object,
      active: true,
    },
    update: { active: true },
  });
}

export async function developVehicleValuation(
  user: CurrentUser | null,
  input: { vehicleId: string; intendedUse: string; intendedUsers: string },
  correlationId: string,
  options?: {
    skipAuth?: boolean;
    actorUserId?: string | null;
    source?: string;
    yearWindow?: number;
  },
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
    include: { collection: true },
  });
  if (!vehicle) throw new Error("Vehicle not found.");
  if (!options?.skipAuth) {
    if (!user || !canMutateCollection(user, vehicle.collection)) {
      throw new Error("Not authorized.");
    }
  }
  const yearWindow = options?.yearWindow ?? 3;

  const queries = [{ make: vehicle.make, model: vehicle.model }];
  const decoded = vehicle.vin ? await decodeNhtsaVin(vehicle.vin) : { ok: false as const };
  if (
    decoded.ok &&
    decoded.decoded.make &&
    decoded.decoded.model &&
    (decoded.decoded.make.toLowerCase() !== vehicle.make.toLowerCase() ||
      decoded.decoded.model.toLowerCase() !== vehicle.model.toLowerCase())
  ) {
    queries.push({ make: decoded.decoded.make, model: decoded.decoded.model });
  }

  let live: Awaited<ReturnType<typeof refreshFromLiveProvider>> = {
    ok: false,
    reason: "No market query ran.",
  };
  for (const query of queries) {
    const result = await refreshFromLiveProvider({
      make: query.make,
      model: query.model,
      yearMin: vehicle.year - yearWindow,
      yearMax: vehicle.year + yearWindow,
    });
    if (result.ok) live = result;
    else if (!live.ok) live = result;
  }

  const stored = await prisma.marketTransaction.findMany({
    where: {
      year: { gte: vehicle.year - yearWindow, lte: vehicle.year + yearWindow },
      OR: queries.map((query) => ({
        AND: [
          { make: { equals: query.make, mode: "insensitive" as const } },
          { model: { equals: query.model, mode: "insensitive" as const } },
        ],
      })),
    },
    orderBy: { auctionEndAt: "desc" },
    take: 80,
  });
  const candidates = stored
    .map(toCandidate)
    .filter((item): item is ComparableCandidate => item !== null);
  const methodology = await ensureDefaultMethodology();
  const draft = developDraftValuation({
    subject: {
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      generation: vehicle.generation,
      trim: vehicle.trim,
      bodyStyle: vehicle.bodyStyle,
      engine: vehicle.engine,
      transmission: vehicle.transmission,
      drivetrain: vehicle.drivetrain,
      mileage: vehicle.currentMileage,
      mileageUnit: vehicle.mileageUnit,
      conditionGrade: vehicle.conditionGrade,
      matchingNumbersStatus: vehicle.matchingNumbersStatus,
      modifications: Array.isArray(vehicle.modifications)
        ? (vehicle.modifications as string[])
        : [],
      titleStatus: vehicle.titleStatus,
    },
    candidates,
    asOf: new Date(),
    intendedUse: input.intendedUse,
    intendedUsers: input.intendedUsers,
    valueType: "FAIR_MARKET",
    methodology: DEFAULT_METHODOLOGY,
    dataSources: ["Old Cars Data stored transactions", "Authorized imports"],
  });

  const freshness = !live.ok && draft.estimate ? "STALE" : draft.freshness;
  const valuation = await prisma.valuation.create({
    data: {
      vehicleId: vehicle.id,
      methodologyVersionId: methodology.id,
      status: draft.status,
      freshness,
      effectiveOn: new Date(),
      intendedUse: input.intendedUse,
      intendedUsers: input.intendedUsers,
      definitionOfValue: "FAIR_MARKET",
      scopeOfWork:
        "Desktop comparable-sales analysis using stored completed transactions. No physical inspection was performed for this draft.",
      dataSources: {
        storedTransactionCount: stored.length,
        liveProvider: live.ok
          ? "old-cars-data"
          : { unavailable: !live.ok, reason: "reason" in live ? live.reason : null },
      },
      estimatedValueMinor: draft.estimate?.amountMinor,
      rangeLowMinor: draft.rangeLow?.amountMinor,
      rangeHighMinor: draft.rangeHigh?.amountMinor,
      currency: "USD",
      confidence: draft.confidence,
      confidenceNote: draft.confidenceNote,
      reconciliation: draft.language.disclaimer,
      limitingConditions:
        "Estimate is limited to available completed-sale evidence. Asking prices, live bids, and reserve-not-met results were excluded. Currency other than USD without a documented FX quote was excluded.",
      assumptions:
        "Subject characteristics as recorded by the collector are assumed accurate unless contradicted by a performed verification check.",
      extraordinaryAssumptions: null,
      insufficientReason: draft.insufficientReason,
      staleBecause:
        !live.ok && draft.estimate
          ? "reason" in live
            ? live.reason
            : "Live provider unavailable"
          : null,
      providerFailure: !live.ok && "reason" in live ? live.reason : null,
    },
  });

  const set = await prisma.comparableSet.create({ data: { valuationId: valuation.id } });
  for (const item of draft.scored) {
    const selection = await prisma.comparableSelection.create({
      data: {
        comparableSetId: set.id,
        marketTransactionId: item.candidate.id,
        included: item.included,
        similarityScore: item.similarityScore,
        inclusionReason: item.inclusionReason,
        exclusionReason: item.exclusionReason,
        differences: item.differences,
        rawValueMinor: item.rawValue.amountMinor,
        adjustedValueMinor: item.adjustedValue.amountMinor,
        weight: item.weight,
      },
    });
    if (item.adjustments.length) {
      await prisma.comparableAdjustment.createMany({
        data: item.adjustments.map((adj) => ({
          selectionId: selection.id,
          factor: adj.factor,
          amountMinor: adj.amountMinor,
          justification: adj.justification,
        })),
      });
    }
  }

  await prisma.valueSnapshot.create({
    data: {
      vehicleId: vehicle.id,
      valuationId: valuation.id,
      capturedOn: valuation.effectiveOn,
      valueType: "FAIR_MARKET",
      amountMinor: valuation.estimatedValueMinor,
      currency: "USD",
      freshness,
      isObservedSale: false,
      note: draft.language.headline,
    },
  });

  await writeAudit({
      actorUserId: options?.actorUserId ?? user?.id ?? vehicle.collection.ownerUserId,
    organizationId: vehicle.collection.organizationId,
    action: "valuation.developed",
    subjectType: "Valuation",
    subjectId: valuation.id,
    newValue: {
      status: valuation.status,
      estimatedValueMinor: valuation.estimatedValueMinor?.toString() ?? null,
    },
    source: options?.source ?? "valuation.develop",
    correlationId,
  });
  return valuation;
}
