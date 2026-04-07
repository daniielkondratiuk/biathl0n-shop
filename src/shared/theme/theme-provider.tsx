// src/shared/theme/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

/**
 * Shared theme provider for the entire app.
 * Wraps next-themes ThemeProvider with the correct configuration.
 *
 * Configuration:
 * - attribute="data-next-theme": avoids coupling OS light/dark to the `class` used
 *   for frontstore/admin brand variants (`theme_first` / `theme_secondary`).
 * - defaultTheme="light" + enableSystem={false}: fresh sessions start in a stable
 *   global light palette; OS `prefers-color-scheme` must not override it.
 * - disableTransitionOnChange: prevents flash during theme switch
 * - storageKey="theme": localStorage key for persistence
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-next-theme"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
