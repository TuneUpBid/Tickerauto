"use client";

import { verifyCredentialAction } from "@/server/actions/app";
import { Button } from "@/components/ui/primitives";

export function CredentialReviewButtons({ credentialId }: { credentialId: string }) {
  return (
    <div className="mt-2 flex gap-2">
      <form
        action={async () => {
          await verifyCredentialAction(credentialId, "VERIFIED");
        }}
      >
        <Button type="submit" variant="secondary">
          Verify
        </Button>
      </form>
      <form
        action={async () => {
          await verifyCredentialAction(credentialId, "REJECTED");
        }}
      >
        <Button type="submit" variant="ghost">
          Reject
        </Button>
      </form>
    </div>
  );
}
