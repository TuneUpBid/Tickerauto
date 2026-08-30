import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Alert, Button, Card } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { ReportActions } from "@/components/reports/report-actions";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const report = await prisma.appraisalReport.findUnique({
    where: { id },
    include: {
      signature: { include: { signer: true } },
      assignment: { include: { collection: true, vehicle: true, valuation: true } },
      shares: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!report) return <AppShell user={user}>Report not found.</AppShell>;
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">{report.title}</h1>
      <p className="text-muted mt-2 text-sm">
        {report.publicId} · v{report.version} · {report.status}
        {report.contentHash ? ` · SHA-256 ${report.contentHash}` : ""}
      </p>
      {report.signature ? (
        <Alert tone="up" title="Signed and immutable">
          Signed by {report.signature.signer.name} on {formatDate(report.signature.signedAt)}.
          Corrections require a new version.
        </Alert>
      ) : (
        <Alert tone="warn" title="Draft report">
          Certification language is a draft and has not been legally approved.
        </Alert>
      )}
      <Card className="mt-6 text-sm whitespace-pre-wrap">{report.certificationText}</Card>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={`/api/reports/${report.id}/pdf`}>
          <Button variant="secondary">Download PDF</Button>
        </a>
        <Link href={`/verify/${report.publicId}`} className="underline">
          Public verification
        </Link>
      </div>
      <ReportActions
        reportId={report.id}
        signed={Boolean(report.signature)}
        shares={report.shares}
      />
    </AppShell>
  );
}
