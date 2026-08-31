import { Card } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { prisma } from "@/server/db";

export default async function VerifyPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const report = await prisma.appraisalReport.findUnique({
    where: { publicId },
    include: { signature: { include: { signer: true } } },
  });
  if (!report) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="display text-3xl">Report not found</h1>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="kicker">Tickerauto verification</p>
      <h1 className="display mt-3 text-4xl">{report.publicId}</h1>
      <Card className="mt-6 space-y-2 text-sm">
        <p>Status: {report.status}</p>
        <p>Version: {report.version}</p>
        <p>Content hash: {report.contentHash ?? "Not finalized"}</p>
        <p>
          Signature:{" "}
          {report.signature
            ? `${report.signature.signer.name} on ${formatDate(report.signature.signedAt)}`
            : "Unsigned draft"}
        </p>
        <p>Finalized: {formatDate(report.finalizedAt)}</p>
        <p>Expires: {formatDate(report.expiresOn)}</p>
      </Card>
    </main>
  );
}
