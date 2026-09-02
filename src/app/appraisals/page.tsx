import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";

export default async function AppraisalsPage() {
  const user = await requireUser();
  const assignments = await prisma.appraisalAssignment.findMany({
    where: {
      OR: [
        { clientUserId: user.id },
        { appraiserUserId: user.id },
        { clientOrgId: { in: user.memberships.map((item) => item.organizationId) } },
      ],
    },
    include: { collection: true, vehicle: true, report: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Appraisal requests</h1>
      {assignments.length === 0 ? (
        <EmptyState title="No assignments yet">
          Request an appraisal from a vehicle valuation after you have documented the car.
        </EmptyState>
      ) : (
        <div className="mt-6 space-y-3">
          {assignments.map((item) => (
            <Card key={item.id}>
              <Link href={`/appraisals/${item.id}`} className="display text-2xl underline">
                {item.vehicle
                  ? `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}`
                  : item.collection.name}
              </Link>
              <p className="text-muted text-sm">
                {item.status} · {formatDate(item.effectiveOn)} · {item.intendedUse}
              </p>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
