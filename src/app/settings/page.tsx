import { AppShell } from "@/components/layout/shell";
import { Card } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";

export default async function SettingsPage() {
  const user = await requireUser();
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Settings and security</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="display text-2xl">Account</h2>
          <p className="mt-2 text-sm">{user.name}</p>
          <p className="text-muted text-sm">{user.email}</p>
          <p className="mt-2 text-sm">
            Email verified: {user.emailVerifiedAt ? "yes" : "no"} · MFA:{" "}
            {user.mfaEnabled ? "enabled" : "architecture ready, not enrolled"}
          </p>
        </Card>
        <Card>
          <h2 className="display text-2xl">Roles</h2>
          <ul className="mt-2 text-sm">
            {user.memberships.map((membership) => (
              <li key={membership.id}>
                {membership.role} · {membership.organization.name} · {membership.status}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="display text-2xl">Sessions</h2>
          <ul className="mt-2 text-sm">
            {sessions.map((session) => (
              <li key={session.id}>
                {session.createdAt.toISOString()} · expires {session.expiresAt.toISOString()}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="display text-2xl">Appearance</h2>
          <p className="text-muted mt-2 text-sm">
            Dark is the standard MotorLedger theme. Use the header control to switch to the
            parchment light theme; the choice is stored on this device only.
          </p>
        </Card>
        <Card>
          <h2 className="display text-2xl">Privacy</h2>
          <p className="text-muted mt-2 text-sm">
            Account export and deletion are available as administrator-assisted workflows in this
            release. VINs, titles, storage locations, and financial records are treated as
            sensitive.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
