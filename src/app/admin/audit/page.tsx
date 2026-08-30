import { AppShell } from "@/components/layout/shell";
import { EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/require";
import { hasRole } from "@/server/rbac";
import { prisma } from "@/server/db";

export default async function AuditPage() {
  const user = await requireUser();
  if (!hasRole(user, "ADMINISTRATOR")) {
    return (
      <AppShell user={user}>
        <EmptyState title="Administrator role required">
          Audit review is limited to administrators.
        </EmptyState>
      </AppShell>
    );
  }
  const events = await prisma.auditEvent.findMany({ orderBy: { timestamp: "desc" }, take: 100 });
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Audit log</h1>
      <p className="text-muted mt-2 text-sm">
        Events are append-only. Signed appraisals cannot be silently altered.
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {events.map((event) => (
          <li key={event.id} className="border-line border-t py-2">
            <span className="tabular">{event.timestamp.toISOString()}</span> · {event.action} ·{" "}
            {event.subjectType} {event.subjectId} · {event.correlationId}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
