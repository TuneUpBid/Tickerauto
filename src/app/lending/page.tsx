import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { requireUser } from "@/server/auth/require";
import { prisma } from "@/server/db";
import { collectionLendingWorkfiles } from "@/server/services/lending";

export default async function LendingPage() {
  const user = await requireUser();
  const collection = await prisma.collection.findFirst({
    where: {
      OR: [
        { ownerUserId: user.id },
        { organizationId: { in: user.memberships.map((item) => item.organizationId) } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  const packs = collection ? await collectionLendingWorkfiles(collection.id) : [];

  return (
    <AppShell user={user}>
      <p className="kicker">Toward lending</p>
      <h1 className="display text-4xl">Lending workfile</h1>
      <p className="text-muted mt-2 max-w-3xl text-sm leading-6">
        Software can fill identity from a VIN, pull completed sales, and assemble a workfile. A
        California Vehicle Verifier can stamp identity. A loan figure still requires a
        disinterested appraiser with a verified value designation, current USPAP, and a human
        signature. You cannot stamp your own cars as independently appraised.
      </p>

      <Card className="mt-6">
        <h2 className="display text-2xl">Your credentials vs a bank file</h2>
        <ul className="text-muted mt-3 space-y-2 text-sm leading-6">
          <li>
            <strong className="text-ink">California DMV Vehicle Verifier</strong> — VIN and
            identity only. Add it under Settings. It cannot certify market value.
          </li>
          <li>
            <strong className="text-ink">Become a value appraiser</strong> — take the 15-hour
            personal-property USPAP course and the current 7-hour update; then pursue IAAA, ASA
            Personal Property, or ISA. California does not issue a state “certified vehicle
            appraiser” license the way it licenses real-estate appraisers.
          </li>
          <li>
            <strong className="text-ink">Use your own credentials</strong> — yes, for other
            people’s cars after a value designation is verified here. No, not for cars you own.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/settings" className="underline">
            Add credentials
          </Link>
          <Link href="/legal/disclosures" className="underline">
            Disclosures
          </Link>
        </div>
      </Card>

      {!collection ? (
        <EmptyState title="No collection">Create a collection first.</EmptyState>
      ) : packs.length === 0 ? (
        <EmptyState title="No vehicles">Add a vehicle to start a lending workfile.</EmptyState>
      ) : (
        <div className="mt-4 space-y-4">
          {packs.map((pack) => (
            <Card key={pack.vehicle.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/vehicles/${pack.vehicle.id}`} className="display text-2xl">
                    {pack.vehicle.year} {pack.vehicle.make} {pack.vehicle.model}
                  </Link>
                  <p className="text-muted mt-1 text-sm">{pack.workfile.headline}</p>
                </div>
                <Badge tone={pack.workfile.readyForHumanReview ? "up" : "warn"}>
                  {pack.workfile.completed}/{pack.workfile.completed + pack.workfile.remaining} ready
                </Badge>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {pack.workfile.items.map((item) => (
                  <li key={item.id} className="border-line flex gap-3 border-t pt-2 first:border-t-0 first:pt-0">
                    <span className={item.done ? "text-up" : "text-muted"}>{item.done ? "Done" : "Open"}</span>
                    <div>
                      <p>{item.label}</p>
                      <p className="text-muted text-xs">{item.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {pack.reportId ? (
                <Link href={`/reports/${pack.reportId}`} className="mt-3 inline-block text-sm underline">
                  Open report
                </Link>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
