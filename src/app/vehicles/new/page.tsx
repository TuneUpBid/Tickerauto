"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createVehicleAction } from "@/server/actions/app";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

function VehicleForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(createVehicleAction, null);
  return (
    <form action={action} className="mt-6 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="collectionId" value={params.get("collectionId") ?? ""} />
      <Field label="VIN">
        <Input name="vin" />
      </Field>
      <Field label="Chassis number">
        <Input name="chassisNumber" />
      </Field>
      <Field label="Year">
        <Input name="year" type="number" required />
      </Field>
      <Field label="Make">
        <Input name="make" required />
      </Field>
      <Field label="Model">
        <Input name="model" required />
      </Field>
      <Field label="Generation / series">
        <Input name="generation" />
      </Field>
      <Field label="Trim">
        <Input name="trim" />
      </Field>
      <Field label="Body style">
        <Input name="bodyStyle" />
      </Field>
      <Field label="Engine">
        <Input name="engine" />
      </Field>
      <Field label="Transmission">
        <Input name="transmission" />
      </Field>
      <Field label="Drivetrain">
        <Input name="drivetrain" />
      </Field>
      <Field label="Exterior color">
        <Input name="exteriorColor" />
      </Field>
      <Field label="Interior color">
        <Input name="interiorColor" />
      </Field>
      <Field label="Mileage">
        <Input name="currentMileage" type="number" />
      </Field>
      <Field label="Mileage unit">
        <Input name="mileageUnit" defaultValue="MI" />
      </Field>
      <Field label="Condition grade">
        <Input name="conditionGrade" />
      </Field>
      <Field label="Title status">
        <Input name="titleStatus" defaultValue="UNKNOWN" />
      </Field>
      <Field label="Storage location (private)">
        <Input name="storageLocation" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Factory options (comma or newline)">
          <Textarea name="factoryOptions" rows={2} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Modifications">
          <Textarea name="modifications" rows={2} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Restoration history">
          <Textarea name="restorationHistory" rows={3} />
        </Field>
      </div>
      <FormStatus error={state?.error} />
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          Save vehicle
        </Button>
      </div>
    </form>
  );
}

export default function NewVehiclePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-4xl">Add vehicle</h1>
      <p className="text-muted mt-2 text-sm">
        VIN, title, and storage location are treated as sensitive and remain private unless you
        share a report.
      </p>
      <Suspense>
        <VehicleForm />
      </Suspense>
    </main>
  );
}
