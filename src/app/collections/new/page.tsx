"use client";

import { useActionState } from "react";
import { createCollectionAction } from "@/server/actions/app";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export default function NewCollectionPage() {
  const [state, action, pending] = useActionState(createCollectionAction, null);
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="display text-3xl">New collection</h1>
      <form action={action} className="mt-6 space-y-4">
        <Field label="Name">
          <Input name="name" required />
        </Field>
        <Field label="Description">
          <Textarea name="description" rows={3} />
        </Field>
        <FormStatus error={state?.error} />
        <Button type="submit" disabled={pending}>
          Create private collection
        </Button>
      </form>
    </main>
  );
}
