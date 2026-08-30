import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button, Card } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";

export default async function AppraisalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const assignment = await prisma.appraisalAssignment.findUnique({
    where: { id },
    include: { collection: true, vehicle: true, valuation: true, report: true, inspection: true },
  });
  if (!assignment) return <AppShell user={user}>Assignment not found.</AppShell>;
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Appraisal assignment</h1>
      <Card className="mt-6 space-y-2 text-sm">
        <p>Status: {assignment.status}</p>
        <p>Collection: {assignment.collection.name}</p>
        <p>
          Subject:{" "}
          {assignment.vehicle
            ? `${assignment.vehicle.year} ${assignment.vehicle.make} ${assignment.vehicle.model}`
            : "Collection-level"}
        </p>
        <p>Effective: {formatDate(assignment.effectiveOn)}</p>
        <p>Intended use: {assignment.intendedUse}</p>
        <p>Intended users: {assignment.intendedUsers}</p>
        <p>Scope: {assignment.scopeOfWork}</p>
      </Card>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/assignments" className="underline">
          Appraiser queue
        </Link>
        {assignment.valuation ? (
          <Link
            href={`/vehicles/${assignment.vehicleId}/valuations/${assignment.valuationId}`}
            className="underline"
          >
            Draft valuation
          </Link>
        ) : null}
        {assignment.report ? (
          <Link href={`/reports/${assignment.report.id}`}>
            <Button variant="secondary">Open report</Button>
          </Link>
        ) : null}
      </div>
    </AppShell>
  );
}
