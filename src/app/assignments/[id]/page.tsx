import { AppShell } from "@/components/layout/shell";
import { Button, Card } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { AssignmentActions } from "@/components/appraiser/assignment-actions";

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
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Appraisal workbench</h1>
      <Card className="mt-6 space-y-2 text-sm">
        <p>Status: {assignment.status}</p>
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
      </Card>
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
