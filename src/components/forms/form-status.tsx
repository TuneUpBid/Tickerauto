"use client";

import { Alert } from "@/components/ui/primitives";

export function FormStatus({ error, ok }: { error?: string; ok?: string }) {
  if (error) {
    return (
      <Alert tone="down" title="Unable to continue">
        {error}
      </Alert>
    );
  }
  if (ok) {
    return (
      <Alert tone="up" title="Saved">
        {ok}
      </Alert>
    );
  }
  return null;
}
