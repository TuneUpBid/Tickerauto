"use client";

import { useActionState } from "react";
import { stampVehicleIdentityAction } from "@/server/actions/app";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function IdentityStampForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(stampVehicleIdentityAction, null);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="Inspection location">
        <Input name="location" />
      </Field>
      <Field label="Verifier notes">
        <Textarea name="notes" rows={2} />
      </Field>
      <FormStatus error={state?.error} ok={state?.ok} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Stamping…" : "Stamp identity (verifier)"}
      </Button>
      <p className="text-muted text-xs">
        A California Vehicle Verifier stamp confirms VIN and identity. It does not certify a dollar
        figure.
      </p>
    </form>
  );
}
