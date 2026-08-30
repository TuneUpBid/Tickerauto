import { add, money, subtract, type Money } from "@/domain/money";
import { calculatePnl, type PnlResult } from "@/domain/pnl";
import { moneyWeightedReturn, periodReturn, timeWeightedReturn } from "@/domain/returns";
import { prisma } from "../db";

export interface VehiclePortfolioRow {
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    status: string;
    era: string | null;
    category: string | null;
  };
  pnl: PnlResult;
  latestValuation: {
    id: string;
    status: string;
    freshness: string;
    estimatedValueMinor: bigint | null;
    effectiveOn: Date;
  } | null;
  latestAppraisal: { id: string; status: string; finalizedAt: Date | null } | null;
}

function expenseSum(
  expenses: { category: string; amountMinor: bigint; currency: string }[],
  categories: string[],
  currency: string,
): Money {
  return expenses
    .filter((item) => categories.includes(item.category) && item.currency === currency)
    .reduce((acc, item) => add(acc, money(item.amountMinor, currency)), money(0, currency));
}

export async function vehiclePnl(vehicleId: string): Promise<PnlResult> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      acquisition: true,
      sale: true,
      expenses: true,
      valuations: { orderBy: { effectiveOn: "desc" }, take: 1 },
    },
  });
  if (!vehicle) throw new Error("Vehicle not found.");
  const currency = vehicle.acquisition?.currency ?? "USD";
  const latest = vehicle.valuations[0];
  const estimated =
    latest?.estimatedValueMinor !== null && latest?.estimatedValueMinor !== undefined
      ? money(latest.estimatedValueMinor, latest.currency)
      : null;
  return calculatePnl({
    currency,
    acquisitionPrice: money(vehicle.acquisition?.priceMinor ?? 0n, currency),
    buyerFees: money(vehicle.acquisition?.buyerFeesMinor ?? 0n, currency),
    transportation: money(vehicle.acquisition?.transportationMinor ?? 0n, currency),
    taxes: money(vehicle.acquisition?.taxesMinor ?? 0n, currency),
    capitalImprovements: expenseSum(vehicle.expenses, ["CAPITAL_IMPROVEMENT"], currency),
    maintenance: expenseSum(vehicle.expenses, ["MAINTENANCE", "STORAGE"], currency),
    insurance: expenseSum(vehicle.expenses, ["INSURANCE"], currency),
    otherOperating: expenseSum(vehicle.expenses, ["OTHER_OPERATING"], currency),
    currentEstimatedValue: vehicle.status === "SOLD" ? null : estimated,
    realizedProceeds: vehicle.sale
      ? money(vehicle.sale.proceedsMinor, vehicle.sale.currency)
      : null,
    sellingFees: vehicle.sale
      ? money(vehicle.sale.sellingFeesMinor, vehicle.sale.currency)
      : expenseSum(vehicle.expenses, ["SELLING_FEE"], currency),
  });
}

export async function collectionPortfolio(collectionId: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      vehicles: {
        include: {
          acquisition: true,
          sale: true,
          expenses: true,
          valuations: { orderBy: { effectiveOn: "desc" }, take: 1 },
          assignments: { include: { report: true } },
        },
      },
      snapshots: { orderBy: { capturedOn: "asc" } },
    },
  });
  if (!collection) throw new Error("Collection not found.");

  const rows: VehiclePortfolioRow[] = [];
  for (const vehicle of collection.vehicles) {
    const pnl = await vehiclePnl(vehicle.id);
    const certified = vehicle.assignments
      .map((item) => item.report)
      .filter((report) => report && (report.status === "ACTIVE" || report.status === "FINALIZED"));
    rows.push({
      vehicle: {
        id: vehicle.id,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        status: vehicle.status,
        era: vehicle.era,
        category: vehicle.category,
      },
      pnl,
      latestValuation: vehicle.valuations[0]
        ? {
            id: vehicle.valuations[0].id,
            status: vehicle.valuations[0].status,
            freshness: vehicle.valuations[0].freshness,
            estimatedValueMinor: vehicle.valuations[0].estimatedValueMinor,
            effectiveOn: vehicle.valuations[0].effectiveOn,
          }
        : null,
      latestAppraisal: certified[0]
        ? {
            id: certified[0]!.id,
            status: certified[0]!.status,
            finalizedAt: certified[0]!.finalizedAt,
          }
        : null,
    });
  }

  const currency = collection.currency;
  const estimatedTotal = rows.reduce(
    (acc, row) => {
      if (!row.pnl.currentEstimatedValue) return acc;
      return add(acc, row.pnl.currentEstimatedValue);
    },
    money(0, currency),
  );
  const acquisitionTotal = rows.reduce(
    (acc, row) => add(acc, row.pnl.acquisitionPrice),
    money(0, currency),
  );
  const costBasisTotal = rows.reduce((acc, row) => add(acc, row.pnl.costBasis), money(0, currency));
  const unrealized = rows.reduce(
    (acc, row) => {
      if (!row.pnl.unrealizedGainLoss) return acc;
      return add(acc, row.pnl.unrealizedGainLoss);
    },
    money(0, currency),
  );
  const realized = rows.reduce(
    (acc, row) => {
      if (!row.pnl.realizedGainLoss) return acc;
      return add(acc, row.pnl.realizedGainLoss);
    },
    money(0, currency),
  );

  const hasAnyEstimate = rows.some((row) => row.pnl.currentEstimatedValue);
  const snapshots = collection.snapshots.map((snap) => ({
    date: snap.capturedOn,
    value: snap.estimatedValueMinor === null ? null : Number(snap.estimatedValueMinor) / 100,
    freshness: snap.freshness,
  }));

  const now = new Date();
  const snapshotAsOf = (days: number) => {
    const target = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prior = [...collection.snapshots]
      .reverse()
      .find((snap) => snap.capturedOn <= target && snap.estimatedValueMinor !== null);
    return prior?.estimatedValueMinor !== undefined && prior?.estimatedValueMinor !== null
      ? Number(prior.estimatedValueMinor) / 100
      : null;
  };
  const current = hasAnyEstimate ? Number(estimatedTotal.amountMinor) / 100 : null;
  const changes = {
    daily: periodReturn(snapshotAsOf(1), current),
    weekly: periodReturn(snapshotAsOf(7), current),
    monthly: periodReturn(snapshotAsOf(30), current),
    yearly: periodReturn(snapshotAsOf(365), current),
    allTime: periodReturn(
      collection.snapshots[0]?.estimatedValueMinor
        ? Number(collection.snapshots[0].estimatedValueMinor) / 100
        : current,
      current,
    ),
  };

  const twr = timeWeightedReturn(
    collection.snapshots
      .filter((snap) => snap.estimatedValueMinor !== null)
      .map((snap) => ({ date: snap.capturedOn, value: Number(snap.estimatedValueMinor) / 100 })),
  );
  const flows = rows.flatMap((row) => {
    const items: { date: Date; amount: number }[] = [];
    if (row.pnl.costBasis.amountMinor > 0n) {
      items.push({ date: now, amount: -Number(row.pnl.costBasis.amountMinor) / 100 });
    }
    if (row.pnl.currentEstimatedValue) {
      items.push({ date: now, amount: Number(row.pnl.currentEstimatedValue.amountMinor) / 100 });
    }
    return items;
  });
  const mwr = moneyWeightedReturn(flows);

  const staleCount = rows.filter(
    (row) =>
      row.latestValuation &&
      ["STALE", "PROVIDER_UNAVAILABLE", "INSUFFICIENT"].includes(row.latestValuation.freshness),
  ).length;
  const certifiedCount = rows.filter((row) => row.latestAppraisal).length;

  return {
    collection,
    rows,
    totals: {
      estimated: hasAnyEstimate ? estimatedTotal : null,
      acquisition: acquisitionTotal,
      costBasis: costBasisTotal,
      unrealized: hasAnyEstimate ? unrealized : null,
      realized,
      vehicleCount: rows.length,
      certifiedCount,
      staleCount,
    },
    changes,
    returns: { twr, mwr },
    snapshots,
    allocation: {
      vehicle: rows
        .filter((row) => row.pnl.currentEstimatedValue && estimatedTotal.amountMinor > 0n)
        .map((row) => ({
          label: `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}`,
          value: Number(row.pnl.currentEstimatedValue!.amountMinor),
          pct:
            Number(
              (row.pnl.currentEstimatedValue!.amountMinor * 10000n) / estimatedTotal.amountMinor,
            ) / 100,
        })),
    },
  };
}

export async function capturePortfolioSnapshot(collectionId: string) {
  const portfolio = await collectionPortfolio(collectionId);
  return prisma.portfolioSnapshot.create({
    data: {
      collectionId,
      capturedOn: new Date(),
      estimatedValueMinor: portfolio.totals.estimated?.amountMinor ?? null,
      acquisitionCostMinor: portfolio.totals.acquisition.amountMinor,
      currency: portfolio.collection.currency,
      freshness: portfolio.totals.staleCount
        ? "STALE"
        : portfolio.totals.estimated
          ? "CURRENT"
          : "INSUFFICIENT",
      vehicleCount: portfolio.totals.vehicleCount,
    },
  });
}

export function netChange(current: Money | null, prior: Money | null): Money | null {
  if (!current || !prior) return null;
  return subtract(current, prior);
}
