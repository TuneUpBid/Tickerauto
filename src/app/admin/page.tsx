import { AppShell } from "@/components/layout/shell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/require";
import { hasRole } from "@/server/rbac";
import { prisma } from "@/server/db";
import { AdminImportForm } from "@/components/admin/import-form";
import { CredentialReviewButtons } from "@/components/admin/credential-review";
import {
  ProbeOldCarsDataButton,
  RefreshOldCarsDataForm,
} from "@/components/admin/old-cars-data-forms";
import { getConfig } from "@/server/config";
import Link from "next/link";

export default async function AdminPage() {
  const user = await requireUser();
  if (!hasRole(user, "ADMINISTRATOR")) {
    return (
      <AppShell user={user}>
        <EmptyState title="Administrator role required">
          Administration is limited to platform administrators.
        </EmptyState>
      </AppShell>
    );
  }
  const config = getConfig();
  const keyConfigured = Boolean(config.market.oldCarsData.apiKey);
  const [users, providers, methodologies, recentAudit, credentials] = await Promise.all([
    prisma.user.count(),
    prisma.marketProvider.findMany(),
    prisma.methodologyVersion.findMany(),
    prisma.auditEvent.findMany({ orderBy: { timestamp: "desc" }, take: 12 }),
    prisma.appraiserCredential.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return (
    <AppShell user={user}>
      <h1 className="display text-4xl">Administration</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-muted text-xs uppercase">Users</p>
          <p className="tabular mt-2 text-3xl">{users}</p>
        </Card>
        <Card>
          <p className="text-muted text-xs uppercase">Data sources</p>
          <ul className="mt-2 text-sm">
            {providers.map((provider) => (
              <li key={provider.id}>
                {provider.name}: {provider.health}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <p className="text-muted text-xs uppercase">Methodologies</p>
          <ul className="mt-2 text-sm">
            {methodologies.map((item) => (
              <li key={item.id}>
                {item.slug} {item.version}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="display text-2xl">Old Cars Data</h2>
        <p className="text-muted mt-2 text-sm">
          Official API {config.market.oldCarsData.baseUrl}. The key is read from{" "}
          <code>OLD_CARS_DATA_API_KEY</code> and is never shown here.
        </p>
        <p className="mt-2 text-sm">
          API key: {keyConfigured ? "configured" : "not configured"} · last health{" "}
          {providers.find((item) => item.slug === "old-cars-data")?.health ?? "unknown"}
        </p>
        {providers.find((item) => item.slug === "old-cars-data")?.lastError ? (
          <p className="text-muted mt-1 text-sm">
            Last error: {providers.find((item) => item.slug === "old-cars-data")?.lastError}
          </p>
        ) : null}
        <ProbeOldCarsDataButton />
        <h3 className="display mt-6 text-xl">Authorized retrieval</h3>
        <p className="text-muted mt-1 text-sm">
          Completed sales only. Live bids and reserve-not-met results are stored with their true
          status and are not used as sold prices.
        </p>
        <RefreshOldCarsDataForm />
      </Card>
      <Card className="mt-6">
        <h2 className="display text-2xl">Authorized market import</h2>
        <p className="text-muted mt-2 text-sm">
          Paste JSON from an authorized provider export. This does not scrape websites.
        </p>
        <AdminImportForm />
      </Card>
      <Card className="mt-6">
        <h2 className="display text-2xl">Credential review</h2>
        <p className="text-muted mt-2 text-sm">
          Verify a license or designation against the issuer. Do not mark a California Vehicle
          Verifier as a value credential.
        </p>
        <ul className="mt-3 space-y-3 text-sm">
          {credentials.map((credential) => (
            <li key={credential.id} className="border-line border-t pt-3">
              {credential.user.email} · {credential.credentialType} · {credential.authority} ·{" "}
              {credential.verificationStatus}
              {credential.credentialNumber ? ` · ${credential.credentialNumber}` : ""}
              {credential.verificationStatus === "UNVERIFIED" ? (
                <CredentialReviewButtons credentialId={credential.id} />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="mt-6">
        <h2 className="display text-2xl">Recent audit events</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {recentAudit.map((event) => (
            <li key={event.id}>
              {event.timestamp.toISOString()} · {event.action} · {event.subjectType}{" "}
              {event.subjectId}
            </li>
          ))}
        </ul>
        <Link href="/admin/audit" className="mt-3 inline-block text-sm underline">
          Full audit log
        </Link>
      </Card>
    </AppShell>
  );
}
