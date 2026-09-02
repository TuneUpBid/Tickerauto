"use client";

import { useActionState } from "react";
import { addCredentialAction } from "@/server/actions/app";
import { CREDENTIAL_TYPE_OPTIONS } from "@/domain/credentials";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function CredentialForm() {
  const [state, action, pending] = useActionState(addCredentialAction, null);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <Field label="Credential">
        <select
          name="credentialType"
          className="border-line bg-bg text-ink min-h-11 w-full rounded-xl border px-3"
          defaultValue="CA_VEHICLE_VERIFIER"
        >
          {CREDENTIAL_TYPE_OPTIONS.map((item) => (
            <option key={item.type} value={item.type}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="License or designation number">
        <Input name="credentialNumber" placeholder="DMV verifier number" />
      </Field>
      <Field label="Issuing body">
        <Input name="organization" required defaultValue="California Department of Motor Vehicles" />
      </Field>
      <Field label="Jurisdiction">
        <Input name="jurisdiction" defaultValue="California" />
      </Field>
      <Field label="Specialty">
        <Input name="specialty" placeholder="Collector automobiles" />
      </Field>
      <Field label="Issued on">
        <Input name="issuedOn" type="date" />
      </Field>
      <Field label="Expires on">
        <Input name="expiresOn" type="date" />
      </Field>
      <Field label="USPAP education current through">
        <Input name="uspapEducationThrough" type="date" />
      </Field>
      <label className="text-sm">
        <input type="checkbox" name="uspapEducationCurrent" /> Current USPAP personal-property
        education
      </label>
      <Field label="Notes">
        <Textarea name="notes" rows={2} />
      </Field>
      <FormStatus error={state?.error} ok={state?.ok} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save credential"}
      </Button>
    </form>
  );
}
