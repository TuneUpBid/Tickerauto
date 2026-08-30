import Link from "next/link";
import { logoutAction } from "@/server/actions/auth";
import type { CurrentUser } from "@/server/auth/session";
import { ThemeToggle } from "./theme-toggle";

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
    <div className="bg-bg text-ink min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4">
        Skip to content
      </a>
      <header className="border-line bg-bg-elevated border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="display text-xl">
            MotorLedger
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-muted hidden text-xs sm:inline">{user.email}</span>
            <form action={logoutAction}>
              <button className="text-muted hover:text-ink text-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
