"use client";

import { useActionState } from "react";
import { requestAppraisalAction } from "@/server/actions/app";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function AppraisalRequestForm({
  collectionId,
  vehicleId,
  valuationId,
}: {
  collectionId: string;
  vehicleId: string;
  valuationId?: string;
}) {
  const [state, action, pending] = useActionState(requestAppraisalAction, null);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="collectionId" value={collectionId} />
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {valuationId ? <input type="hidden" name="valuationId" value={valuationId} /> : null}
      <Field label="Intended use">
        <Input
          name="intendedUse"
          defaultValue="Collateral review by a prospective lender"
          required
        />
      </Field>
      <Field label="Intended users">
        <Input
          name="intendedUsers"
          defaultValue="Collector and authorized lender personnel"
          required
        />
      </Field>
      <Field label="Effective date">
        <Input name="effectiveOn" type="date" required />
      </Field>
      <Field label="Scope of work">
        <Textarea
          name="scopeOfWork"
          required
          defaultValue="Review collector evidence, inspect or remotely document the subject, analyze completed comparable sales, and produce a signed personal-property appraisal report."
        />
      </Field>
      <FormStatus error={state?.error} />
      <Button type="submit" disabled={pending}>
        Request appraisal
      </Button>
    </form>
  );
}
