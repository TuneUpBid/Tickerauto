import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button, Card, EmptyState, Stat } from "@/components/ui/primitives";
import { MarksCard } from "@/components/dashboard/marks-card";
import { RefreshMarksForm } from "@/components/dashboard/refresh-marks-form";
import { latestMarksJob, marksScheduleLabel } from "@/server/services/marks";
import { formatMoney } from "@/domain/money";
import { formatPercent } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { collectionPortfolio } from "@/server/services/portfolio";

const HOLDING_DOTS = ["#5b8def", "#e08a4a", "#9aa0a6", "#9b7ed9", "#d4a15a"];

function holdingChange(row: {
  pnl: {
    costBasis: { amountMinor: bigint };
    currentEstimatedValue: { amountMinor: bigint } | null;
  };
}) {
  const cost = row.pnl.costBasis.amountMinor;
  const estimate = row.pnl.currentEstimatedValue?.amountMinor;
  if (!estimate || cost <= 0n) return null;
  return Number(estimate - cost) / Number(cost);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const collection = await prisma.collection.findFirst({
    where: {
      OR: [
        { ownerUserId: user.id },
        { organizationId: { in: user.memberships.map((item) => item.organizationId) } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!collection) {
    return (
      <AppShell user={user}>
        <EmptyState title="No collection yet">
          Create a private collection to begin documenting vehicles.
          <div className="mt-4">
            <Link href="/collections/new" className="underline">
              Create collection
            </Link>
          </div>
        </EmptyState>
      </AppShell>
    );
  }

  const [portfolio, marksJob] = await Promise.all([
    collectionPortfolio(collection.id),
    latestMarksJob(),
  ]);
  const estimated = portfolio.totals.estimated;
  const lastSnapshot = portfolio.snapshots.at(-1)?.date ?? marksJob?.finishedAt ?? null;

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{collection.name}</p>
          <h1 className="display text-4xl">Portfolio</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/collections/${collection.id}`}>
            <Button variant="secondary">Collection</Button>
          </Link>
          <RefreshMarksForm />
          <Link href={`/vehicles/new?collectionId=${collection.id}`}>
            <Button>Add vehicle</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Estimated value" value={formatMoney(estimated)} />
        <Stat label="Acquisition cost" value={formatMoney(portfolio.totals.acquisition)} />
        <Stat
          label="Unrealized"
          value={formatMoney(portfolio.totals.unrealized)}
          direction={
            portfolio.totals.unrealized
              ? portfolio.totals.unrealized.amountMinor > 0n
                ? "up"
                : portfolio.totals.unrealized.amountMinor < 0n
                  ? "down"
                  : "flat"
              : undefined
          }
        />
        <Stat label="Realized" value={formatMoney(portfolio.totals.realized)} />
      </div>

      <MarksCard
        snapshots={portfolio.snapshots}
        changes={portfolio.changes}
        lastMarkedAt={lastSnapshot}
        scheduleNote={`Completed sales are pulled once each ${marksScheduleLabel()} day after midnight. If the app was offline then, the pass runs when it comes back. Charts use stored snapshots only — no interpolated days.`}
      />

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="display text-2xl">Holdings</h2>
          <Link href={`/collections/${collection.id}`} className="text-muted text-sm">
            View all
          </Link>
        </div>
        {portfolio.rows.length ? (
          <ul className="mt-1">
            {portfolio.rows.map((row, index) => {
              const label = `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}`;
              const change = holdingChange(row);
              const changeDir =
                change === null ? undefined : change > 0 ? "up" : change < 0 ? "down" : "flat";
              return (
                <li key={row.vehicle.id} className="border-line border-t first:border-t-0">
                  <Link
                    href={`/vehicles/${row.vehicle.id}`}
                    className="flex items-center gap-3 py-3.5"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: HOLDING_DOTS[index % HOLDING_DOTS.length] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{label}</p>
                      <p className="text-muted mt-0.5 truncate text-xs">
                        {row.latestAppraisal
                          ? "Independently appraised"
                          : row.latestValuation?.estimatedValueMinor
                            ? "Source-backed estimate"
                            : "Insufficient verified data"}
                        {row.latestValuation ? ` · ${row.latestValuation.freshness}` : ""}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-right">
                      {formatMoney(row.pnl.currentEstimatedValue)}
                    </p>
                    <p
                      className={
                        changeDir === "up"
                          ? "text-up tabular w-24 shrink-0 text-right text-sm"
                          : changeDir === "down"
                            ? "text-down tabular w-24 shrink-0 text-right text-sm"
                            : "text-muted tabular w-24 shrink-0 text-right text-sm"
                      }
                    >
                      {row.pnl.currentEstimatedValue && change !== null
                        ? formatPercent(change)
                        : "—"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted mt-3 text-sm">No vehicles in this collection yet.</p>
        )}
      </Card>
    </AppShell>
  );
}
