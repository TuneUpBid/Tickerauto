import Link from "next/link";

export function AppNav({
  links,
  compact = false,
}: {
  links: { href: string; label: string }[];
  compact?: boolean;
}) {
  return (
    <nav className={compact ? "flex flex-col gap-1 py-2" : "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            compact
              ? "text-ink min-h-11 rounded-xl px-3 py-3 text-base"
              : "text-muted hover:text-ink inline-flex min-h-11 items-center"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
