"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";
import { AuthBrand } from "@/components/layout/auth-brand";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <AuthBrand />
      <h1 className="display mt-8 text-3xl">Sign in</h1>
      <form action={action} className="mt-6 space-y-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormStatus error={state?.error} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-muted mt-4 text-sm">
        <Link href="/forgot-password">Forgot password</Link>
        {" · "}
        <Link href="/register">Create account</Link>
      </p>
    </main>
  );
}
