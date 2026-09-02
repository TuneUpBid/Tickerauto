import { AppShell } from "@/components/layout/shell";
import { Button, Card } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { AssignmentActions } from "@/components/appraiser/assignment-actions";
import { canSignValue } from "@/domain/credentials";
import { vehicleLendingWorkfile } from "@/server/services/lending";

export default async function AssignmentWorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const assignment = await prisma.appraisalAssignment.findUnique({
    where: { id },
    include: {
      collection: true,
      vehicle: true,
      valuation: { include: { comparableSet: { include: { selections: true } } } },
      inspection: true,
      report: true,
      appraiser: { include: { credentials: true } },
    },
  });
  if (!assignment) return <AppShell user={user}>Assignment not found.</AppShell>;
  const pack = assignment.vehicleId ? await vehicleLendingWorkfile(assignment.vehicleId) : null;
  const valueReady = assignment.appraiser?.credentials.some((cred) => canSignValue(cred).ok);
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Appraisal workbench</h1>
      <Card className="mt-6 space-y-2 text-sm">
        <p>Status: {assignment.status}</p>
        <p>Engagement: {assignment.engagementKind}</p>
        <p>Scope: {assignment.scopeOfWork}</p>
        <p>
          Credentials:{" "}
          {assignment.appraiser?.credentials.length
            ? assignment.appraiser.credentials
                .map(
                  (cred) =>
                    `${cred.credentialType} (${cred.verificationStatus}${cred.expiresOn && cred.expiresOn < new Date() ? ", EXPIRED" : ""})`,
                )
                .join("; ")
            : "No credentials on file. Expired or unverified credentials must not be presented as current."}
        </p>
        <p>
          Value signature:{" "}
          {valueReady
            ? "Verified value designation on file"
            : "Blocked until a verified ASA/IAAA/ISA (or equivalent) record with current USPAP is on the signer"}
        </p>
      </Card>
      {pack ? (
        <Card className="mt-4">
          <h2 className="display text-2xl">Workfile</h2>
          <p className="text-muted mt-2 text-sm">{pack.workfile.headline}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {pack.workfile.items.map((item) => (
              <li key={item.id}>
                {item.done ? "Done" : "Open"} — {item.label}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <AssignmentActions assignmentId={assignment.id} reportId={assignment.report?.id} />
      {assignment.report ? (
        <div className="mt-4">
          <a href={`/reports/${assignment.report.id}`}>
            <Button variant="secondary">Open report</Button>
          </a>
        </div>
      ) : null}
    </AppShell>
  );
}
