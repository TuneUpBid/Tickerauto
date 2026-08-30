"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/server/actions/auth";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, null);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="display text-2xl">
        MotorLedger
      </Link>
      <h1 className="display mt-8 text-3xl">Create a collector account</h1>
      <form action={action} className="mt-6 space-y-4">
        <Field label="Your name">
          <Input name="name" required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Organization or collection name">
          <Input name="organizationName" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" required minLength={12} />
        </Field>
        <Field label="Confirm password">
          <Input name="confirmPassword" type="password" required minLength={12} />
        </Field>
        <label className="text-muted flex items-start gap-2 text-sm">
          <input name="acceptDisclosures" type="checkbox" className="mt-1" />I understand that
          market estimates are opinions, not guarantees, not bank approved, and not independently
          appraised until a qualified appraiser signs a report. I have read the disclosures.
        </label>
        <FormStatus error={state?.error} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
    </main>
  );
}
