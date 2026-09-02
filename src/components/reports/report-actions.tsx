"use client";

import { useActionState } from "react";
import { shareReportAction, signReportAction, revokeShareAction } from "@/server/actions/app";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function ReportActions({
  reportId,
  signed,
  shares,
}: {
  reportId: string;
  signed: boolean;
  shares: { id: string; status: string; expiresAt: Date }[];
}) {
  const [shareState, shareAction, sharePending] = useActionState(shareReportAction, null);
  const [signState, signAction, signPending] = useActionState(signReportAction, null);
  return (
    <div className="mt-6 space-y-6">
      {!signed ? (
        <form action={signAction}>
          <input type="hidden" name="reportId" value={reportId} />
          <FormStatus error={signState?.error} />
          <Button type="submit" disabled={signPending}>
            {signPending ? "Signing…" : "Sign as independent appraiser"}
          </Button>
          <p className="text-muted mt-2 text-xs">
            Requires a verified value designation, current USPAP, and a signer who is not the
            owner. A California Vehicle Verifier license is not enough.
          </p>
        </form>
      ) : (
        <form action={shareAction} className="border-line grid gap-3 border p-4">
          <h2 className="display text-2xl">Share with a lender</h2>
          <input type="hidden" name="reportId" value={reportId} />
          <Field label="Expires in days">
            <Input name="expiresInDays" type="number" defaultValue="14" />
          </Field>
          <Field label="Allow download">
            <Input name="canDownload" defaultValue="true" />
          </Field>
          <FormStatus error={shareState?.error} ok={shareState?.url} />
          <Button type="submit" disabled={sharePending}>
            Create revocable share link
          </Button>
        </form>
      )}
      <ul className="space-y-2 text-sm">
        {shares.map((share) => (
          <li key={share.id} className="flex items-center justify-between gap-3">
            <span>
              {share.status} · expires {new Date(share.expiresAt).toISOString().slice(0, 10)}
            </span>
            {share.status === "ACTIVE" ? (
              <form
                action={async () => {
                  await revokeShareAction(share.id, reportId);
                }}
              >
                <Button type="submit" variant="danger">
                  Revoke
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
