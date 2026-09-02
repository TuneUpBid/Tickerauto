import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/require";
import { hasRole } from "@/server/rbac";
import { prisma } from "@/server/db";

export default async function AssignmentsPage() {
  const user = await requireUser();
  if (!hasRole(user, "APPRAISER") && !hasRole(user, "ADMINISTRATOR")) {
    return (
      <AppShell user={user}>
        <EmptyState title="Appraiser role required">
          This queue is limited to appraisers.
        </EmptyState>
      </AppShell>
    );
  }
  const items = await prisma.appraisalAssignment.findMany({
    include: { collection: true, vehicle: true, client: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Assignment dashboard</h1>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <Link href={`/assignments/${item.id}`} className="display text-2xl underline">
              {item.status} · {item.collection.name}
            </Link>
            <p className="text-muted text-sm">
              Client {item.client.name} · {item.intendedUse}
            </p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
