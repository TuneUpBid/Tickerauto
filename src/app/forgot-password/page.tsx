"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";
import { AuthBrand } from "@/components/layout/auth-brand";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <AuthBrand />
      <h1 className="display mt-8 text-3xl">Reset password</h1>
      <form action={action} className="mt-6 space-y-4">
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <FormStatus
          error={state?.error}
          ok={state?.ok ? "If an account exists, a reset link was sent." : undefined}
        />
        <Button type="submit" disabled={pending} className="w-full">
          Send reset link
        </Button>
      </form>
    </main>
  );
}
