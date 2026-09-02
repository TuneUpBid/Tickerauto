"use client";

import {
  acceptAssignmentAction,
  draftReportAction,
  recordInspectionAction,
} from "@/server/actions/app";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useActionState } from "react";
import { FormStatus } from "@/components/forms/form-status";

export function AssignmentActions({
  assignmentId,
  reportId,
}: {
  assignmentId: string;
  reportId?: string;
}) {
  const [state, action, pending] = useActionState(recordInspectionAction, null);
  return (
    <div className="mt-6 space-y-6">
      <form
        action={async () => {
          await acceptAssignmentAction(assignmentId);
        }}
      >
        <Button type="submit" variant="secondary">
          Accept assignment
        </Button>
      </form>
      <form action={action} className="border-line grid gap-3 border p-4">
        <h2 className="display text-2xl">Inspection</h2>
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <Field label="Type">
          <Input name="type" defaultValue="REMOTE_DOCUMENTED" />
        </Field>
        <Field label="Inspection date">
          <Input name="inspectedAt" type="datetime-local" required />
        </Field>
        <Field label="Location">
          <Input name="location" />
        </Field>
        <Field label="Notes">
          <Textarea name="notes" />
        </Field>
        <label className="text-sm">
          <input type="checkbox" name="collectorAcknowledged" /> Collector acknowledged
        </label>
        <FormStatus error={state?.error} />
        <Button type="submit" disabled={pending} variant="secondary">
          Save inspection
        </Button>
      </form>
      {!reportId ? (
        <form
          action={async () => {
            await draftReportAction(assignmentId);
          }}
        >
          <Button type="submit">Prepare draft report</Button>
        </form>
      ) : null}
    </div>
  );
}
