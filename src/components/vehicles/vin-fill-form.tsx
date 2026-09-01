"use client";

import { useActionState } from "react";
import { fillVehicleFromVinAction } from "@/server/actions/app";
import { Button } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function VinFillForm({ vehicleId, vin }: { vehicleId: string; vin: string | null }) {
  const [state, action, pending] = useActionState(fillVehicleFromVinAction, null);
  if (!vin) return null;
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Filling from VIN…" : "Fill missing fields from VIN"}
      </Button>
      <FormStatus error={state?.error} ok={state?.ok} />
    </form>
  );
}
