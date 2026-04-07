// components/ui/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/shared/theme/use-mounted";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
      >
        <span className="h-4 w-4 rounded-full bg-neutral-500" />
      </button>
    );
  }

  const isDark =
    theme === "dark" || (theme === "system" && systemTheme === "dark");

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
    >
      <span
        className={`h-4 w-4 rounded-full transition ${
          isDark ? "bg-accent-orange" : "bg-neutral-900"
        }`}
      />
    </button>
  );
}


