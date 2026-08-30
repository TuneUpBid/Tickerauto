"use client";

import { useActionState } from "react";
import { uploadDocumentAction } from "@/server/actions/app";
import { Button, Field, Input } from "@/components/ui/primitives";
import { FormStatus } from "@/components/forms/form-status";

export function UploadForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(uploadDocumentAction, null);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Field label="Kind">
        <Input name="kind" defaultValue="PHOTO" />
      </Field>
      <Field label="File (PDF, JPEG, PNG, WebP, max 25 MB)">
        <Input name="file" type="file" required />
      </Field>
      <FormStatus error={state?.error} />
      <div>
        <Button type="submit" disabled={pending} variant="secondary">
          Upload
        </Button>
      </div>
    </form>
  );
}
