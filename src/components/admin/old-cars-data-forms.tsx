"use client";

import { useActionState } from "react";
import { probeOldCarsDataAction, refreshOldCarsDataAction } from "@/server/actions/app";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function ProbeOldCarsDataButton() {
  const [state, action, pending] = useActionState(
    async () => probeOldCarsDataAction(),
    null as { error?: string; ok?: string } | null,
  );
  return (
    <form action={action} className="mt-4 space-y-3">
      <FormStatus error={state?.error} ok={state?.ok} />
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Testing…" : "Test Old Cars Data connection"}
      </Button>
    </form>
  );
}

export function RefreshOldCarsDataForm() {
  const [state, action, pending] = useActionState(refreshOldCarsDataAction, null);
  return (
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
      <Field label="Make">
        <Input name="make" placeholder="Porsche" required />
      </Field>
      <Field label="Model">
        <Input name="model" placeholder="911" required />
      </Field>
      <Field label="Year min">
        <Input name="yearMin" type="number" />
      </Field>
      <Field label="Year max">
        <Input name="yearMax" type="number" />
      </Field>
      <FormStatus error={state?.error} ok={state?.ok} />
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Retrieving…" : "Retrieve completed sales"}
        </Button>
      </div>
    </form>
  );
}
