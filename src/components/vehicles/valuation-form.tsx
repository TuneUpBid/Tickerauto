"use client";

import { useActionState } from "react";
import { developValuationAction } from "@/server/actions/app";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function ValuationRequestForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(developValuationAction, null);
  return (
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="Intended use">
        <Input name="intendedUse" defaultValue="Internal collection monitoring" required />
      </Field>
      <Field label="Intended users">
        <Input name="intendedUsers" defaultValue="Collector of record" required />
      </Field>
      <FormStatus error={state?.error} />
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Developing…" : "Develop draft valuation"}
        </Button>
      </div>
    </form>
  );
}
