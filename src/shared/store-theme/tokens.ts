// src/shared/store-theme/tokens.ts
/**
 * ============================================================================
 * STORE THEME TOKENS - Single Source of Truth for Frontstore Theme
 * ============================================================================
 *
 * POLICY: Do NOT use `useTheme()` from next-themes anywhere else in the
 * frontstore codebase. All theme-dependent values must come from this module
 * via `useStoreThemeTokens()`.
 *
 * This ensures:
 * - Consistent theme handling across all components
 * - No hydration mismatches
 * - Easy to extend for Admin theme later
 * - Single place to update theme colors/values
 *
 * ESLint suggestion (add to eslintrc if desired):
 * {
 *   "no-restricted-imports": ["error", {
 *     "paths": [{
 *       "name": "next-themes",
 *       "importNames": ["useTheme"],
 *       "message": "Use useStoreThemeTokens() from @/shared/store-theme instead."
 *     }]
 *   }]
 * }
 * ============================================================================
 */

"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/shared/theme";

// ============================================================================
// Theme Color Constants
// ============================================================================

const THEME_COLORS = {
  light: {
    headerBgSolid: "#a5b4fc",
    headerBgGlass: "rgba(165, 180, 252, 0.8)",
    footerBgSolid: "#a5b4fc",
    patternBaseBg: "#a5b4fc",
  },
  dark: {
    headerBgSolid: "#1e1b4b",
    headerBgGlass: "rgba(30, 27, 75, 0.8)",
    footerBgSolid: "#1e1b4b",
    patternBaseBg: "#1e1b4b",
  },
} as const;

const THEME_ASSETS = {
  light: {
    logoSrc: "/logo-light.svg",
  },
  dark: {
    logoSrc: "/logo-dark.svg",
  },
} as const;

const THEME_VALUES = {
  patternOpacity: 0.3,
  patternSizePx: 300,
  headerGlassBlurPx: 12,
} as const;

// ============================================================================
// Types
// ============================================================================

export type ResolvedTheme = "light" | "dark";

export interface StoreThemeTokens {
  /** Whether the component is mounted (client-side). Use to avoid hydration flicker. */
  mounted: boolean;

  /** The resolved theme after system preference is applied ("light" | "dark") */
  resolvedTheme: ResolvedTheme;

  /** Convenience boolean for dark mode checks */
  isDark: boolean;

  /** Logo source path based on current theme */
  logoSrc: string;

  /** Solid background color for header (when not scrolled) */
  headerBgSolid: string;

  /** Semi-transparent background color for header glass effect (when scrolled) */
  headerBgGlass: string;

  /** Blur amount in pixels for header glass effect */
  headerGlassBlurPx: number;

  /** Solid background color for footer */
  footerBgSolid: string;

  /** Base background color behind the pattern (visible if pattern fails to load) */
  patternBaseBg: string;

  /** Opacity for the pattern overlay (0-1) */
  patternOpacity: number;

  /** Pattern tile size in pixels */
  patternSizePx: number;
}

// ============================================================================
// Default (SSR-safe) tokens - used before mount to prevent hydration mismatch
// ============================================================================

const DEFAULT_THEME: ResolvedTheme = "light";

const DEFAULT_TOKENS: StoreThemeTokens = {
  mounted: false,
  resolvedTheme: DEFAULT_THEME,
  isDark: false,
  logoSrc: THEME_ASSETS.light.logoSrc,
  headerBgSolid: THEME_COLORS.light.headerBgSolid,
  headerBgGlass: THEME_COLORS.light.headerBgGlass,
  headerGlassBlurPx: THEME_VALUES.headerGlassBlurPx,
  footerBgSolid: THEME_COLORS.light.footerBgSolid,
  patternBaseBg: THEME_COLORS.light.patternBaseBg,
  patternOpacity: THEME_VALUES.patternOpacity,
  patternSizePx: THEME_VALUES.patternSizePx,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Returns theme tokens for the frontstore.
 *
 * IMPORTANT: This is the ONLY hook that should use `useTheme()` from next-themes
 * in the frontstore. All other components should use this hook.
 *
 * @returns StoreThemeTokens - typed object with all theme-dependent values
 */
export function useStoreThemeTokens(): StoreThemeTokens {
  const { resolvedTheme: nextResolvedTheme } = useTheme();
  const mounted = useMounted();

  // Before mount, return stable defaults to prevent hydration mismatch
  if (!mounted) {
    return DEFAULT_TOKENS;
  }

  // After mount, compute actual values based on resolved theme
  const resolvedTheme: ResolvedTheme =
    nextResolvedTheme === "dark" ? "dark" : "light";
  const isDark = resolvedTheme === "dark";

  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const assets = isDark ? THEME_ASSETS.dark : THEME_ASSETS.light;

  return {
    mounted,
    resolvedTheme,
    isDark,
    logoSrc: assets.logoSrc,
    headerBgSolid: colors.headerBgSolid,
    headerBgGlass: colors.headerBgGlass,
    headerGlassBlurPx: THEME_VALUES.headerGlassBlurPx,
    footerBgSolid: colors.footerBgSolid,
    patternBaseBg: colors.patternBaseBg,
    patternOpacity: THEME_VALUES.patternOpacity,
    patternSizePx: THEME_VALUES.patternSizePx,
  };
}
