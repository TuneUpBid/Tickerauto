import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button, Card, EmptyState, Stat } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { formatPercent } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { collectionPortfolio } from "@/server/services/portfolio";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";

const PERIODS = [
  { key: "daily", label: "1D" },
  { key: "weekly", label: "1W" },
  { key: "monthly", label: "1M" },
  { key: "yearly", label: "1Y" },
  { key: "allTime", label: "All" },
] as const;

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

  const portfolio = await collectionPortfolio(collection.id);
  const estimated = portfolio.totals.estimated;
  const changeDir = (value: number | null) =>
    value === null ? undefined : value > 0 ? "up" : value < 0 ? "down" : "flat";
  const allocationByLabel = new Map(portfolio.allocation.vehicle.map((item) => [item.label, item]));

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

      <Card className="mt-4">
        <h2 className="display text-2xl">Marks</h2>
        <PortfolioChart snapshots={portfolio.snapshots} />
        <div className="mt-4 grid grid-cols-5 gap-2">
          {PERIODS.map((period) => {
            const value = portfolio.changes[period.key];
            const direction = changeDir(value);
            return (
              <div key={period.key} className="text-center">
                <p className="kicker">{period.label}</p>
                <p
                  className={
                    direction === "up"
                      ? "text-up tabular mt-1 text-sm"
                      : direction === "down"
                        ? "text-down tabular mt-1 text-sm"
                        : "text-muted tabular mt-1 text-sm"
                  }
                >
                  {formatPercent(value)}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="display text-2xl">Holdings</h2>
          <Link href={`/collections/${collection.id}`} className="text-muted text-sm">
            View all
          </Link>
        </div>
        {portfolio.rows.length ? (
          <ul className="mt-2">
            {portfolio.rows.map((row) => {
              const label = `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}`;
              const share = allocationByLabel.get(label);
              return (
                <li key={row.vehicle.id} className="border-line border-t py-4 first:border-t-0">
                  <Link href={`/vehicles/${row.vehicle.id}`} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-muted mt-1 text-xs">
                        {row.latestAppraisal
                          ? "Independently appraised"
                          : row.latestValuation
                            ? "Source-backed estimate"
                            : "Insufficient verified data"}
                        {row.latestValuation ? ` · ${row.latestValuation.freshness}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular">{formatMoney(row.pnl.currentEstimatedValue)}</p>
                      {share ? <p className="text-muted tabular mt-1 text-xs">{share.pct.toFixed(1)}%</p> : null}
                    </div>
                  </Link>
                  {share ? (
                    <div className="bg-bg-muted mt-3 h-1 overflow-hidden rounded-full">
                      <div
                        className="bg-accent h-full rounded-full"
                        style={{ width: `${Math.min(share.pct, 100)}%` }}
                      />
                    </div>
                  ) : null}
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
