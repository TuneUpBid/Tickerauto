import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Alert, Badge, Card } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { AppraisalRequestForm } from "@/components/appraiser/request-form";

export default async function ValuationDetailPage({
  params,
}: {
  params: Promise<{ id: string; valuationId: string }>;
}) {
  const user = await requireUser();
  const { id, valuationId } = await params;
  const valuation = await prisma.valuation.findUnique({
    where: { id: valuationId },
    include: {
      vehicle: true,
      methodologyVersion: true,
      comparableSet: {
        include: {
          selections: {
            include: { marketTransaction: true, adjustments: true },
            orderBy: { similarityScore: "desc" },
          },
        },
      },
    },
  });
  if (!valuation) return <AppShell user={user}>Valuation not found.</AppShell>;
  const estimate = valuation.estimatedValueMinor
    ? { amountMinor: valuation.estimatedValueMinor, currency: valuation.currency }
    : null;

  return (
    <AppShell user={user}>
      <p className="text-muted text-xs uppercase">
        <Link href={`/vehicles/${id}`}>
          {valuation.vehicle.year} {valuation.vehicle.make} {valuation.vehicle.model}
        </Link>
      </p>
      <h1 className="display mt-2 text-4xl">Valuation</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={valuation.status === "INSUFFICIENT_DATA" ? "warn" : "neutral"}>
          {valuation.status === "CERTIFIED"
            ? "Independently appraised value"
            : "Source-backed market estimate"}
        </Badge>
        <Badge tone={valuation.freshness === "CURRENT" ? "up" : "warn"}>
          {valuation.freshness}
        </Badge>
      </div>
      <Card className="mt-6">
        <p className="text-muted text-xs uppercase">Fair market estimate</p>
        <p className="tabular mt-2 text-4xl">{formatMoney(estimate)}</p>
        <p className="text-muted mt-2 text-sm">
          Range{" "}
          {valuation.rangeLowMinor
            ? `${formatMoney({ amountMinor: valuation.rangeLowMinor, currency: valuation.currency })} – ${formatMoney(
                {
                  amountMinor: valuation.rangeHighMinor ?? valuation.rangeLowMinor,
                  currency: valuation.currency,
                },
              )}`
            : "Insufficient verified data"}
        </p>
        <p className="mt-3 text-sm">{valuation.confidenceNote || valuation.insufficientReason}</p>
        {valuation.providerFailure ? (
          <Alert tone="warn" title="Provider unavailable">
            {valuation.providerFailure}. The last verified evidence was preserved.
          </Alert>
        ) : null}
      </Card>
      <Card className="mt-6">
        <h2 className="display text-2xl">Comparable sales</h2>
        <p className="text-muted mt-2 text-sm">
          Methodology {valuation.methodologyVersion.version}. Exclusions are retained.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted text-xs uppercase">
              <tr>
                <th className="py-2">Source</th>
                <th>Included</th>
                <th>Similarity</th>
                <th>Raw</th>
                <th>Adjusted</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {valuation.comparableSet?.selections.map((sel) => (
                <tr key={sel.id} className="border-line border-t align-top">
                  <td className="py-3">
                    <div>{sel.marketTransaction.source}</div>
                    {sel.marketTransaction.sourceUrl ? (
                      <a
                        href={sel.marketTransaction.sourceUrl}
                        className="text-xs underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source record
                      </a>
                    ) : null}
                    <div className="text-muted text-xs">
                      {formatDate(sel.marketTransaction.auctionEndAt)}
                    </div>
                  </td>
                  <td>{sel.included ? "Yes" : "No"}</td>
                  <td className="tabular">{sel.similarityScore.toFixed(0)}</td>
                  <td className="tabular">
                    {sel.rawValueMinor
                      ? formatMoney({ amountMinor: sel.rawValueMinor, currency: "USD" })
                      : "—"}
                  </td>
                  <td className="tabular">
                    {sel.adjustedValueMinor
                      ? formatMoney({ amountMinor: sel.adjustedValueMinor, currency: "USD" })
                      : "—"}
                  </td>
                  <td className="text-muted max-w-sm">
                    {sel.inclusionReason || sel.exclusionReason}
                    {sel.adjustments.map((adj) => (
                      <div key={adj.id} className="mt-1 text-xs">
                        {adj.factor}: {adj.justification}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="mt-6">
        <h2 className="display text-2xl">Request independent appraisal</h2>
        <AppraisalRequestForm
          collectionId={valuation.vehicle.collectionId}
          vehicleId={valuation.vehicleId}
          valuationId={valuation.id}
        />
      </Card>
    </AppShell>
  );
}
