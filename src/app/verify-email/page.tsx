import Link from "next/link";
import { verifyEmailAction } from "@/server/actions/auth";
import { AuthBrand } from "@/components/layout/auth-brand";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sent?: string; email?: string }>;
}) {
  const params = await searchParams;
  let message = "Check the development console or your email for a verification link.";
  if (params.token) {
    const result = await verifyEmailAction(params.token);
    message = result.error ?? "Email verified. You can sign in.";
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <AuthBrand />
      <h1 className="display mt-8 text-3xl">Verify email</h1>
      <p className="text-muted mt-4 text-sm">{message}</p>
      {params.email ? <p className="mt-2 text-sm">Sent to {params.email}</p> : null}
      <Link href="/login" className="mt-6 text-sm underline">
        Continue to sign in
      </Link>
    </main>
  );
}
