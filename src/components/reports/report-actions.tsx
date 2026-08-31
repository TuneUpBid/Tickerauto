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
  const [state, action, pending] = useActionState(shareReportAction, null);
  return (
    <div className="mt-6 space-y-6">
      {!signed ? (
        <form
          action={async () => {
            await signReportAction(reportId);
          }}
        >
          <Button type="submit">Sign as independent appraiser</Button>
        </form>
      ) : (
        <form action={action} className="border-line grid gap-3 border p-4">
          <h2 className="display text-2xl">Share with a lender</h2>
          <input type="hidden" name="reportId" value={reportId} />
          <Field label="Expires in days">
            <Input name="expiresInDays" type="number" defaultValue="14" />
          </Field>
          <Field label="Allow download">
            <Input name="canDownload" defaultValue="true" />
          </Field>
          <FormStatus error={state?.error} ok={state?.url} />
          <Button type="submit" disabled={pending}>
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
