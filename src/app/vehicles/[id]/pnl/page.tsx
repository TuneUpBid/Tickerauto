import { AppShell } from "@/components/layout/shell";
import { Card } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { requireUser } from "@/server/auth/require";
import { vehiclePnl } from "@/server/services/portfolio";
import { prisma } from "@/server/db";
import { ExpenseForm } from "@/components/vehicles/financial-forms";

export default async function PnlPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return <AppShell user={user}>Vehicle not found.</AppShell>;
  const pnl = await vehiclePnl(id);
  const rows = [
    ["Acquisition price", pnl.acquisitionPrice],
    ["Initial transaction costs", pnl.initialTransactionCosts],
    ["Capital improvements", pnl.capitalImprovements],
    ["Cost basis", pnl.costBasis],
    ["Operating and maintenance", pnl.operatingAndMaintenance],
    ["Current estimated value", pnl.currentEstimatedValue],
    ["Unrealized gain/loss", pnl.unrealizedGainLoss],
    ["Realized proceeds", pnl.realizedProceeds],
    ["Selling fees", pnl.sellingFees],
    ["Realized gain/loss", pnl.realizedGainLoss],
    ["Gross appreciation", pnl.grossAppreciation],
    ["Net economic return", pnl.netEconomicReturn],
  ] as const;

  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">
        P&L · {vehicle.year} {vehicle.make} {vehicle.model}
      </h1>
      <p className="text-muted mt-2 max-w-2xl text-sm">{pnl.labels.grossAppreciation}</p>
      <Card className="mt-6">
        <dl className="divide-line divide-y">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-3 text-sm">
              <dt>{label}</dt>
              <dd className="tabular">{formatMoney(value)}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="mt-6">
        <h2 className="display text-2xl">Record an expense</h2>
        <ExpenseForm vehicleId={id} />
      </Card>
    </AppShell>
  );
}
