// src/shared/theme/theme-toggle.tsx
"use client";

import { useMounted } from "./use-mounted";
import {
  getFrontstorePrimary,
  useFrontstoreThemeMode,
  useStoreThemeTokens,
} from "@/shared/store-theme";

/**
 * Theme toggle button component.
 * Uses project theme semantics (`theme_first` / `theme_secondary`) and a mounted guard
 * to prevent hydration mismatches.
 */
export function ThemeToggle() {
  const mounted = useMounted();
  const t = useStoreThemeTokens();
  const frontstoreTheme = useFrontstoreThemeMode();
  const oppositeMode = t.mode === "theme_first" ? "theme_secondary" : "theme_first";
  const innerColor = getFrontstorePrimary(oppositeMode);

  // Render placeholder until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderColor: "rgba(255, 255, 255, 0.18)",
          color: t.white,
        }}
      >
        <span className="h-3 w-3 rounded-full bg-neutral-500" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={frontstoreTheme.toggleMode}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition"
      style={{
        backgroundColor: t.primary,
        borderColor: t.primary,
        color: t.white,
      }}
    >
      <span
        className="h-3 w-3 rounded-full transition"
        style={{ backgroundColor: innerColor }}
      />
    </button>
  );
}
