import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Alert, Badge, Button, Card } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { vehiclePnl } from "@/server/services/portfolio";
import { AcquisitionForm } from "@/components/vehicles/financial-forms";
import { ValuationRequestForm } from "@/components/vehicles/valuation-form";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      collection: true,
      acquisition: true,
      expenses: { orderBy: { incurredOn: "desc" } },
      documents: { orderBy: { createdAt: "desc" }, take: 8 },
      verificationChecks: { orderBy: { createdAt: "desc" } },
      valuations: { orderBy: { effectiveOn: "desc" }, take: 5 },
      assignments: { include: { report: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!vehicle) return <AppShell user={user}>Vehicle not found.</AppShell>;
  const pnl = await vehiclePnl(vehicle.id);
  const latest = vehicle.valuations[0];

  return (
    <AppShell user={user}>
      <p className="text-muted text-xs tracking-wide uppercase">
        <Link href={`/collections/${vehicle.collectionId}`}>{vehicle.collection.name}</Link>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-4xl">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/vehicles/${vehicle.id}/documents`}>
            <Button variant="secondary">Document vault</Button>
          </Link>
          <Link href={`/vehicles/${vehicle.id}/pnl`}>
            <Button variant="secondary">P&L</Button>
          </Link>
        </div>
      </div>
      <p className="text-muted mt-2 text-sm">
        {vehicle.trim ?? "No trim recorded"} · {vehicle.bodyStyle ?? "Body style unknown"} · VIN{" "}
        {vehicle.vin ?? "not provided"}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-muted text-xs uppercase">Latest figure</p>
          <p className="tabular mt-2 text-2xl">{formatMoney(pnl.currentEstimatedValue)}</p>
          <p className="text-muted mt-2 text-xs">
            {latest
              ? `${latest.status === "CERTIFIED" ? "Independently appraised value" : "Source-backed market estimate"} · ${latest.freshness}`
              : "Insufficient verified data"}
          </p>
        </Card>
        <Card>
          <p className="text-muted text-xs uppercase">Cost basis</p>
          <p className="tabular mt-2 text-2xl">{formatMoney(pnl.costBasis)}</p>
        </Card>
        <Card>
          <p className="text-muted text-xs uppercase">Net economic return</p>
          <p className="tabular mt-2 text-2xl">{formatMoney(pnl.netEconomicReturn)}</p>
          <p className="text-muted mt-2 text-xs">{pnl.labels.netEconomicReturn}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="display text-2xl">Identity checks</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {vehicle.verificationChecks.map((check) => (
              <li key={check.id} className="border-line border-t pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span>{check.type.replaceAll("_", " ")}</span>
                  <Badge
                    tone={
                      check.outcome === "PASSED"
                        ? "up"
                        : check.outcome === "FAILED"
                          ? "down"
                          : "warn"
                    }
                  >
                    {check.outcome.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="text-muted text-xs">
                  Provider: {check.provider}
                  {check.performedAt ? ` · ${formatDate(check.performedAt)}` : " · not performed"}
                  {check.sourceReference ? ` · ${check.sourceReference}` : ""}
                </p>
                <p className="text-muted mt-1">{check.summary}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="display text-2xl">Acquisition</h2>
          {vehicle.acquisition ? (
            <p className="mt-3 text-sm">
              {formatDate(vehicle.acquisition.acquiredOn)} ·{" "}
              {formatMoney({
                amountMinor: vehicle.acquisition.priceMinor,
                currency: vehicle.acquisition.currency,
              })}
            </p>
          ) : (
            <Alert tone="warn" title="No verified acquisition yet">
              Enter the actual purchase price and transaction costs. These are not estimated.
            </Alert>
          )}
          <AcquisitionForm vehicleId={vehicle.id} />
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="display text-2xl">Draft valuation</h2>
        <p className="text-muted mt-2 text-sm">
          Uses stored completed sales only. If the live provider is unavailable, the last imported
          evidence is preserved and marked stale.
        </p>
        <ValuationRequestForm vehicleId={vehicle.id} />
        <ul className="mt-4 space-y-2 text-sm">
          {vehicle.valuations.map((valuation) => (
            <li key={valuation.id}>
              <Link
                href={`/vehicles/${vehicle.id}/valuations/${valuation.id}`}
                className="underline"
              >
                {formatDate(valuation.effectiveOn)} · {valuation.status} ·{" "}
                {valuation.estimatedValueMinor
                  ? formatMoney({
                      amountMinor: valuation.estimatedValueMinor,
                      currency: valuation.currency,
                    })
                  : "Insufficient verified data"}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
