// src/shared/theme/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useMounted } from "./use-mounted";

/**
 * Theme toggle button component.
 * Uses next-themes useTheme() hook and the useMounted guard to prevent hydration mismatches.
 *
 * Features:
 * - Renders a placeholder until mounted to avoid hydration mismatch
 * - Uses resolvedTheme for accurate current theme (handles "system" → actual theme)
 * - Toggles between light and dark themes
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  // Render placeholder until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
      >
        <span className="h-3 w-3 rounded-full bg-neutral-500" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
    >
      <span
        className={`h-3 w-3 rounded-full transition ${
          isDark ? "bg-[#F9F9F3]" : "bg-neutral-900"
        }`}
      />
    </button>
  );
}
