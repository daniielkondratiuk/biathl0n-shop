"use client";

import type { FrontstoreThemeMode } from "./mode";

export type StoreThemeColorTokens = {
  // Foundation / base
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
  footerBgSolid: string;

  // Layout / navbar
  headerBg: string;
  headerText: string;
  headerIcon: string;
  headerIconHover: string;
  headerSearchText: string;
  headerSearchPlaceholder: string;
  headerSearchBorder: string;
  headerSearchBorderFocus: string;
  navLinkBarBg: string;
  navLinkBg: string;
  filterPanelBg: string;
  navLinkText: string;
  navLinkTextMuted: string;
  navLinkTextHover: string;
  navLinkTextActive: string;
  navLinkFocusRing: string;

  // Layout / footer
  footerBg: string;
  footerText: string;
  footerTextMuted: string;
  footerIcon: string;
  footerIconHover: string;

  // Background / pattern
  patternBaseBg: string;
  backgroundImage: string;
  snowImage: string;
};

/**
 * Keep Biathl0n’s existing header/footer palette, but expose it through the
 * same token surface as Istawi’s frontstore theme system.
 *
 * Use CSS variables where possible to stay generic/portable across clones.
 */
export const FRONTSTORE_THEME_COLORS: Record<
  FrontstoreThemeMode,
  StoreThemeColorTokens
> = {
  theme_first: {
    primary: "var(--accent)",
    primaryHover: "var(--ring)",
    white: "#ffffff",
    textPrimary: "var(--foreground)",
    textSecondary: "var(--muted-foreground)",
    pageBg: "var(--background)",
    cardBg: "var(--card)",
    border: "var(--border)",

    headerBgSolid: "#a5b4fc",
    headerBgGlass: "rgba(165, 180, 252, 0.8)",
    footerBgSolid: "#a5b4fc",
    patternBaseBg: "#a5b4fc",
    backgroundImage: 'url("/background-first.svg")',
    snowImage: "/snow-first.svg",

    headerBg: "rgba(179, 209, 237, 1)",
    headerText: "rgba(23, 23, 23, 1)",
    headerIcon: "var(--foreground)",
    headerIconHover: "color-mix(in oklab, var(--foreground) 75%, transparent)",
    headerSearchText: "var(--foreground)",
    headerSearchPlaceholder:
      "color-mix(in oklab, var(--foreground) 55%, transparent)",
    headerSearchBorder: "color-mix(in oklab, var(--foreground) 40%, transparent)",
    headerSearchBorderFocus: "var(--ring)",

    navLinkBg: "rgba(179, 209, 237, 0.5)",
    navLinkBarBg: "rgba(179, 209, 237, 0.5)",
    filterPanelBg: "rgba(179, 209, 237, 0.5)",
    navLinkText: "color-mix(in oklab, var(--foreground) 70%, transparent)",
    navLinkTextMuted: "color-mix(in oklab, var(--foreground) 55%, transparent)",
    navLinkTextHover: "var(--foreground)",
    navLinkTextActive: "var(--foreground)",
    navLinkFocusRing: "var(--ring)",

    footerBg: "rgba(179, 209, 237, 1)",
    footerText: "rgba(23, 23, 23, 1)",
    footerTextMuted: "var(--muted-foreground)",
    footerIcon: "var(--foreground)",
    footerIconHover: "color-mix(in oklab, var(--foreground) 85%, transparent)",
  },
  theme_secondary: {
    primary: "var(--accent)",
    primaryHover: "var(--ring)",
    white: "#ffffff",
    textPrimary: "var(--foreground)",
    textSecondary: "var(--muted-foreground)",
    pageBg: "var(--background)",
    cardBg: "var(--card)",
    border: "var(--border)",

    headerBgSolid: "#1e1b4b",
    headerBgGlass: "rgba(30, 27, 75, 0.8)",
    footerBgSolid: "#1e1b4b",
    patternBaseBg: "#1e1b4b",
    backgroundImage: 'url("/background-secondary.svg")',
    snowImage: "/snow-secondary.svg",

    headerBg: "rgba(13, 59, 102, 1)",
    headerText: "rgba(245, 245, 245, 1)",
    headerIcon: "var(--foreground)",
    headerIconHover: "color-mix(in oklab, var(--foreground) 75%, transparent)",
    headerSearchText: "var(--foreground)",
    headerSearchPlaceholder:
      "color-mix(in oklab, var(--foreground) 55%, transparent)",
    headerSearchBorder: "color-mix(in oklab, var(--foreground) 40%, transparent)",
    headerSearchBorderFocus: "var(--ring)",

    navLinkBg: "rgba(255, 255, 255, 0.05)",
    navLinkBarBg: "rgba(255, 255, 255, 0.05)",
    filterPanelBg: "rgba(255, 255, 255, 0.5)",
    navLinkText: "color-mix(in oklab, var(--foreground) 70%, transparent)",
    navLinkTextMuted: "color-mix(in oklab, var(--foreground) 55%, transparent)",
    navLinkTextHover: "var(--foreground)",
    navLinkTextActive: "var(--foreground)",
    navLinkFocusRing: "var(--ring)",

    footerBg: "rgba(13, 59, 102, 1)",
    footerText: "rgba(245, 245, 245, 1)",
    footerTextMuted: "var(--muted-foreground)",
    footerIcon: "var(--foreground)",
    footerIconHover: "color-mix(in oklab, var(--foreground) 85%, transparent)",
  },
} as const;

export function getFrontstorePrimary(mode: FrontstoreThemeMode): string {
  return FRONTSTORE_THEME_COLORS[mode].primary;
}

export const FRONTSTORE_THEME_ASSETS = {
  theme_first: {
    logoSrc: "/logo-light.png",
  },
  theme_secondary: {
    logoSrc: "/logo-dark.png",
  },
} as const;

export const FRONTSTORE_THEME_VALUES = {
  patternOpacity: 0.3,
  patternSizePx: 300,
  headerGlassBlurPx: 12,
} as const;

