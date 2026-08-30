"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "@/server/actions/auth";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";
import { Suspense } from "react";

function ResetForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={params.get("token") ?? ""} />
      <Field label="New password">
        <Input name="password" type="password" required minLength={12} />
      </Field>
      <Field label="Confirm password">
        <Input name="confirmPassword" type="password" required minLength={12} />
      </Field>
      <FormStatus error={state?.error} />
      <Button type="submit" disabled={pending} className="w-full">
        Update password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="display text-3xl">Choose a new password</h1>
      <Suspense>
        <ResetForm />
      </Suspense>
    </main>
  );
}
