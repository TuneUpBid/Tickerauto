"use client";

import { useTheme } from "next-themes";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme ?? "dark") !== "light";

  return (
    <button
      type="button"
      className="border-line text-ink inline-flex min-h-11 items-center border px-3 text-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      suppressHydrationWarning
    >
      {compact ? (isDark ? "Light" : "Dark") : isDark ? "Light paper" : "Dark paper"}
    </button>
  );
}
