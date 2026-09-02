"use client";

import { useActionState } from "react";
import { saveAcquisitionAction, saveExpenseAction } from "@/server/actions/app";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function AcquisitionForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(saveAcquisitionAction, null);
  return (
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="Acquisition date">
        <Input name="acquiredOn" type="date" required />
      </Field>
      <Field label="Purchase price">
        <Input name="price" type="number" step="0.01" required />
      </Field>
      <Field label="Buyer fees">
        <Input name="buyerFees" type="number" step="0.01" defaultValue="0" />
      </Field>
      <Field label="Transportation">
        <Input name="transportation" type="number" step="0.01" defaultValue="0" />
      </Field>
      <Field label="Taxes">
        <Input name="taxes" type="number" step="0.01" defaultValue="0" />
      </Field>
      <Field label="Currency">
        <Input name="currency" defaultValue="USD" />
      </Field>
      <FormStatus error={state?.error} />
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending} variant="secondary">
          Save acquisition
        </Button>
      </div>
    </form>
  );
}

export function ExpenseForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(saveExpenseAction, null);
  return (
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="Category">
        <Input name="category" defaultValue="MAINTENANCE" />
      </Field>
      <Field label="Date">
        <Input name="incurredOn" type="date" required />
      </Field>
      <Field label="Amount">
        <Input name="amount" type="number" step="0.01" required />
      </Field>
      <Field label="Currency">
        <Input name="currency" defaultValue="USD" />
      </Field>
      <Field label="Description">
        <Input name="description" />
      </Field>
      <FormStatus error={state?.error} />
      <div>
        <Button type="submit" disabled={pending} variant="secondary">
          Add expense
        </Button>
      </div>
    </form>
  );
}
