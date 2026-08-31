import Link from "next/link";
import { logoutAction } from "@/server/actions/auth";
import type { CurrentUser } from "@/server/auth/session";
import { ThemeToggle } from "./theme-toggle";
import { AppNav } from "./app-nav";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const role = user.memberships.find((item) => item.status === "ACTIVE")?.role ?? "COLLECTOR";
  const links = [
    { href: "/dashboard", label: "Portfolio" },
    { href: "/market", label: "Comparables" },
    { href: "/appraisals", label: "Appraisals" },
    ...(role === "APPRAISER" || role === "ADMINISTRATOR"
      ? [{ href: "/assignments", label: "Assignments" }]
      : []),
    ...(role === "LENDER" || role === "ADMINISTRATOR"
      ? [{ href: "/lender", label: "Lender" }]
      : []),
    ...(role === "ADMINISTRATOR" ? [{ href: "/admin", label: "Admin" }] : []),
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="bg-bg text-ink min-h-screen pb-20 lg:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4">
        Skip to content
      </a>
      <header className="border-line bg-bg-elevated sticky top-0 z-20 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="display text-xl">
            MotorLedger
          </Link>
          <div className="hidden lg:block">
            <AppNav links={links} />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-muted hidden max-w-40 truncate text-xs lg:inline">{user.email}</span>
            <form action={logoutAction}>
              <button className="text-muted hover:text-ink min-h-11 px-2 text-sm" type="submit">
                Sign out
              </button>
            </form>
            <details className="lg:hidden">
              <summary className="border-line min-h-11 cursor-pointer list-none rounded-full border px-4 py-2 text-sm">
                Menu
              </summary>
              <div className="border-line bg-bg-elevated absolute top-full right-4 mt-2 w-56 rounded-2xl border p-2 shadow-lg">
                <AppNav links={links} compact />
              </div>
            </details>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
