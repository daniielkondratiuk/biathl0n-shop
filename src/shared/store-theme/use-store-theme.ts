"use client";

import { useMemo } from "react";
import { useFrontstoreThemeMode, type FrontstoreThemeMode } from "./mode";
import {
  FRONTSTORE_THEME_ASSETS,
  FRONTSTORE_THEME_COLORS,
  FRONTSTORE_THEME_VALUES,
} from "./values";

/**
 * Technical color scheme used for CSS variable switching.
 * Storefront business naming should use `mode` (`theme_first` / `theme_secondary`).
 */
export type ResolvedColorScheme = "light" | "dark";

/** Backward-compatible alias (avoid using as storefront "mode"). */
export type ResolvedTheme = ResolvedColorScheme;

export interface StoreThemeTokens {
  mounted: boolean;
  mode: FrontstoreThemeMode;
  isSecondary: boolean;

  /**
   * Backward-compatible technical color scheme fields.
   * Storefront semantics remain `theme_first` / `theme_secondary` via `mode`.
   */
  resolvedTheme: ResolvedColorScheme;
  isDark: boolean;

  logoSrc: string;

  primary: string;
  primaryHover: string;
  white: string;
  textPrimary: string;
  textSecondary: string;
  pageBg: string;
  cardBg: string;
  border: string;
  headerBgSolid: string;
  headerBgGlass: string;
  headerGlassBlurPx: number;
  footerBgSolid: string;

  headerBg: string;
  headerText: string;
  headerIcon: string;
  headerIconHover: string;
  headerSearchText: string;
  headerSearchPlaceholder: string;
  headerSearchBorder: string;
  headerSearchBorderFocus: string;
  navLinkBarBg: string;
  filterPanelBg: string;
  navLinkText: string;
  navLinkTextMuted: string;
  navLinkTextHover: string;
  navLinkTextActive: string;
  navLinkFocusRing: string;
  footerBg: string;
  footerText: string;
  footerTextMuted: string;
  footerIcon: string;
  footerIconHover: string;

  patternBaseBg: string;
  patternOpacity: number;
  patternSizePx: number;
  backgroundImage: string;
  snowImage: string;
}

const DEFAULT_MODE: FrontstoreThemeMode = "theme_first";

const DEFAULT_TOKENS: StoreThemeTokens = {
  mounted: false,
  mode: DEFAULT_MODE,
  isSecondary: false,

  resolvedTheme: "light",
  isDark: false,

  logoSrc: FRONTSTORE_THEME_ASSETS.theme_first.logoSrc,

  ...FRONTSTORE_THEME_COLORS.theme_first,
  headerGlassBlurPx: FRONTSTORE_THEME_VALUES.headerGlassBlurPx,
  patternOpacity: FRONTSTORE_THEME_VALUES.patternOpacity,
  patternSizePx: FRONTSTORE_THEME_VALUES.patternSizePx,
};

export function useStoreThemeTokens(): StoreThemeTokens {
  const { mounted, mode, isSecondary } = useFrontstoreThemeMode();

  return useMemo(() => {
    if (!mounted) return DEFAULT_TOKENS;

    const colors = FRONTSTORE_THEME_COLORS[mode];
    const assets = FRONTSTORE_THEME_ASSETS[mode];
    const resolvedTheme: ResolvedColorScheme = isSecondary ? "dark" : "light";

    return {
      mounted,
      mode,
      isSecondary,
      resolvedTheme,
      isDark: resolvedTheme === "dark",
      logoSrc: assets.logoSrc,
      ...colors,
      headerGlassBlurPx: FRONTSTORE_THEME_VALUES.headerGlassBlurPx,
      patternOpacity: FRONTSTORE_THEME_VALUES.patternOpacity,
      patternSizePx: FRONTSTORE_THEME_VALUES.patternSizePx,
    };
  }, [isSecondary, mode, mounted]);
}

