import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button, Card } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { requireUser } from "@/server/auth/require";
import { collectionPortfolio } from "@/server/services/portfolio";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const portfolio = await collectionPortfolio(id);
  return (
    <AppShell user={user}>
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">{portfolio.collection.name}</h1>
        <Link href={`/vehicles/new?collectionId=${id}`}>
          <Button>Add vehicle</Button>
        </Link>
      </div>
      <div className="mt-6 grid gap-4">
        {portfolio.rows.map((row) => (
          <Card key={row.vehicle.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/vehicles/${row.vehicle.id}`} className="display text-2xl underline">
                  {row.vehicle.year} {row.vehicle.make} {row.vehicle.model}
                </Link>
                <p className="text-muted text-sm">
                  {row.vehicle.status} · {row.latestValuation?.status ?? "No valuation"}
                </p>
              </div>
              <p className="tabular text-xl">{formatMoney(row.pnl.currentEstimatedValue)}</p>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
