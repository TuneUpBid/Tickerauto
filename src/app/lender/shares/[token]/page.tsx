import { AppShell } from "@/components/layout/shell";
import { Alert, Button, Card } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { requireUser } from "@/server/auth/require";
import { loadShareByToken } from "@/server/services/sharing";
import { LenderDecisionForm } from "@/components/lender/decision-form";

export default async function LenderSharePage({ params }: { params: Promise<{ token: string }> }) {
  const user = await requireUser();
  const { token } = await params;
  const result = await loadShareByToken(token, user);
  if (!result.ok) {
    return (
      <AppShell user={user}>
        <Alert tone="down" title="Access denied">
          {result.reason}
        </Alert>
      </AppShell>
    );
  }
  const { share } = result;
  const valuation = share.report.assignment.valuation;
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Collateral package</h1>
      <p className="text-muted text-sm">
        {share.report.publicId} · {share.report.status} · hash {share.report.contentHash}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-muted text-xs uppercase">Collection</p>
          <p className="display mt-2 text-2xl">{share.report.assignment.collection.name}</p>
        </Card>
        <Card>
          <p className="text-muted text-xs uppercase">Source-backed / appraised value</p>
          <p className="tabular mt-2 text-2xl">
            {valuation?.estimatedValueMinor
              ? formatMoney({
                  amountMinor: valuation.estimatedValueMinor,
                  currency: valuation.currency,
                })
              : "Insufficient verified data"}
          </p>
          <p className="text-muted text-xs">{valuation?.status}</p>
        </Card>
      </div>
      {share.canDownload ? (
        <div className="mt-4">
          <a href={`/api/reports/${share.report.id}/pdf`}>
            <Button>Download authorized PDF</Button>
          </a>
        </div>
      ) : (
        <Alert tone="warn" title="Download disabled">
          The collector did not authorize file download.
        </Alert>
      )}
      <LenderDecisionForm shareId={share.id} token={token} />
    </AppShell>
  );
}
