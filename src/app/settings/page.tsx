import { AppShell } from "@/components/layout/shell";
import { Badge, Card } from "@/components/ui/primitives";
import { CredentialForm } from "@/components/settings/credential-form";
import { catalogEntry } from "@/domain/credentials";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";

export default async function SettingsPage() {
  const user = await requireUser();
  const [sessions, credentials] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appraiserCredential.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
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
        <Card className="md:col-span-2">
          <h2 className="display text-2xl">Credentials</h2>
          <p className="text-muted mt-2 text-sm">
            A California Vehicle Verifier license stamps identity. A verified ASA, IAAA, or ISA
            record with current USPAP is what can sign value — and never on cars you own.
          </p>
          {credentials.length ? (
            <ul className="mt-4 space-y-3 text-sm">
              {credentials.map((credential) => {
                const catalog = catalogEntry(credential.credentialType);
                return (
                  <li key={credential.id} className="border-line border-t pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{catalog.label}</p>
                      <Badge
                        tone={
                          credential.verificationStatus === "VERIFIED"
                            ? "up"
                            : credential.verificationStatus === "REJECTED"
                              ? "down"
                              : "warn"
                        }
                      >
                        {credential.verificationStatus} · {credential.authority}
                      </Badge>
                    </div>
                    <p className="text-muted mt-1 text-xs">
                      {credential.organization}
                      {credential.credentialNumber ? ` · ${credential.credentialNumber}` : ""}
                      {credential.jurisdiction ? ` · ${credential.jurisdiction}` : ""}
                    </p>
                    <p className="text-muted mt-1 text-xs">{catalog.summary}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted mt-3 text-sm">No credentials on file yet.</p>
          )}
          <CredentialForm />
        </Card>
        <Card>
          <h2 className="display text-2xl">Appearance</h2>
          <p className="text-muted mt-2 text-sm">
            Dark paper is the standard. Use the header control for light paper. The choice stays
            on this device.
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
