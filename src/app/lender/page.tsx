import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/require";
import { hasRole } from "@/server/rbac";
import { prisma } from "@/server/db";

export default async function LenderHomePage() {
  const user = await requireUser();
  if (!hasRole(user, "LENDER") && !hasRole(user, "ADMINISTRATOR")) {
    return (
      <AppShell user={user}>
        <EmptyState title="Lender role required">
          This portal is limited to authorized lender users with an active share.
        </EmptyState>
      </AppShell>
    );
  }
  const shares = await prisma.reportShare.findMany({
    where: {
      OR: [
        { lenderOrgId: { in: user.memberships.map((item) => item.organizationId) } },
        { createdById: user.id },
      ],
    },
    include: { report: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Lender portal</h1>
      <p className="text-muted mt-2 text-sm">
        Access is limited to borrower-authorized reports. Methodology approval is an explicit
        recorded action and is never inferred.
      </p>
      <div className="mt-6 space-y-3">
        {shares.map((share) => (
          <Card key={share.id}>
            <p className="display text-2xl">{share.report.title}</p>
            <p className="text-muted text-sm">
              {share.status} · {share.report.publicId}
            </p>
          </Card>
        ))}
      </div>
      <p className="text-muted mt-6 text-sm">
        Open a share URL provided by the collector, or{" "}
        <Link href="/settings" className="underline">
          review access history in settings
        </Link>
        .
      </p>
    </AppShell>
  );
}
