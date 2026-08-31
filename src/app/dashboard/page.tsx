import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Alert, Button, Card, EmptyState, Stat } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { formatPercent } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { collectionPortfolio } from "@/server/services/portfolio";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";

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

      <Alert tone="neutral" title="How these figures are labeled">
        Estimated values are source-backed market estimates or independently appraised values. They
        are not guaranteed, not bank approved, and not invented when evidence is missing.
      </Alert>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Estimated collection value"
          value={formatMoney(estimated)}
          hint="Sum of latest source-backed estimates. Appraised values are shown separately when signed."
        />
        <Stat
          label="Verified acquisition cost"
          value={formatMoney(portfolio.totals.acquisition)}
          hint="Collector-entered purchase prices only."
        />
        <Stat
          label="Unrealized gain/loss"
          value={formatMoney(portfolio.totals.unrealized)}
          hint="Versus cost basis, not acquisition price alone."
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
        <Stat
          label="Realized gain/loss"
          value={formatMoney(portfolio.totals.realized)}
          hint="After selling fees versus cost basis."
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-5">
        {(["daily", "weekly", "monthly", "yearly", "allTime"] as const).map((period) => (
          <Stat
            key={period}
            label={`${period === "allTime" ? "All-time" : period} change`}
            value={formatPercent(portfolio.changes[period])}
            hint="Computed from stored snapshots, not interpolated daily marks."
            direction={changeDir(portfolio.changes[period])}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <h2 className="display text-2xl">Observed valuation marks</h2>
          <p className="text-muted mt-1 text-sm">
            Points are stored snapshots. Gaps and stale periods are visible rather than smoothed.
          </p>
          <PortfolioChart snapshots={portfolio.snapshots} />
        </Card>
        <div className="space-y-4">
          <Stat label="Vehicles" value={String(portfolio.totals.vehicleCount)} />
          <Stat label="Certified appraisals" value={String(portfolio.totals.certifiedCount)} />
          <Stat
            label="Stale or insufficient"
            value={String(portfolio.totals.staleCount)}
            hint="Last verified value is preserved. Nothing was fabricated."
          />
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="display text-2xl">Allocation</h2>
        {portfolio.allocation.vehicle.length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {portfolio.allocation.vehicle.map((item) => (
              <li key={item.label} className="flex justify-between gap-4">
                <span>{item.label}</span>
                <span className="tabular text-muted">{item.pct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-3 text-sm">
            Insufficient verified data for allocation percentages.
          </p>
        )}
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="display text-2xl">Vehicles</h2>
          <Link href={`/collections/${collection.id}`} className="text-sm underline">
            View collection
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="kicker">
              <tr>
                <th className="py-2">Vehicle</th>
                <th>Estimate</th>
                <th>Status</th>
                <th>Freshness</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.rows.map((row) => (
                <tr key={row.vehicle.id} className="border-line border-t">
                  <td className="py-3">
                    <Link href={`/vehicles/${row.vehicle.id}`} className="underline">
                      {row.vehicle.year} {row.vehicle.make} {row.vehicle.model}
                    </Link>
                  </td>
                  <td className="tabular">{formatMoney(row.pnl.currentEstimatedValue)}</td>
                  <td>
                    {row.latestAppraisal
                      ? "Independently appraised"
                      : row.latestValuation
                        ? "Draft / estimate"
                        : "No value"}
                  </td>
                  <td>{row.latestValuation?.freshness ?? "INSUFFICIENT"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
