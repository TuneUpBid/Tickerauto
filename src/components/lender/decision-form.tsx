"use client";

import { useActionState } from "react";
import { lenderDecisionAction } from "@/server/actions/app";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function LenderDecisionForm({ shareId, token }: { shareId: string; token: string }) {
  const [state, action, pending] = useActionState(lenderDecisionAction, null);
  return (
    <form action={action} className="border-line mt-6 grid gap-3 rounded-2xl border p-4">
      <h2 className="display text-2xl">Record an explicit decision</h2>
      <input type="hidden" name="shareId" value={shareId} />
      <input type="hidden" name="token" value={token} />
      <Field label="Decision">
        <Input name="status" defaultValue="ADDITIONAL_EVIDENCE_REQUIRED" />
      </Field>
      <Field label="Reason">
        <Textarea name="reason" required />
      </Field>
      <FormStatus error={state?.error} />
      <Button type="submit" disabled={pending}>
        Record lender action
      </Button>
    </form>
  );
}
