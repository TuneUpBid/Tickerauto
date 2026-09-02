"use client";

import { useActionState } from "react";
import { refreshCollectionMarksAction } from "@/server/actions/app";
import { Button } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function RefreshMarksForm() {
  const [state, action, pending] = useActionState(refreshCollectionMarksAction, null);
  return (
    <form action={action}>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Refreshing comps…" : "Refresh marks now"}
      </Button>
      <FormStatus error={state?.error} ok={state?.ok} />
    </form>
  );
}
