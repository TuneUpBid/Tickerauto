"use client";

import { useActionState } from "react";
import { importMarketJsonAction } from "@/server/actions/app";
import { Button, Textarea } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function AdminImportForm() {
  const [state, action, pending] = useActionState(importMarketJsonAction, null);
  return (
    <form action={action} className="mt-4 space-y-3">
      <Textarea name="json" rows={8} placeholder='{"data":[...authorized records...]}' />
      <FormStatus error={state?.error} ok={state?.ok} />
      <Button type="submit" disabled={pending} variant="secondary">
        Import authorized JSON
      </Button>
    </form>
  );
}
