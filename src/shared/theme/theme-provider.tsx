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
 * - attribute="class": toggles `dark` class on <html> element
 * - defaultTheme="system": respects user's OS preference by default
 * - enableSystem: enables automatic system theme detection
 * - disableTransitionOnChange: prevents flash during theme switch
 * - storageKey="theme": localStorage key for persistence
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
