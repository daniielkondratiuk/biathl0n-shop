"use client";

import type React from "react";
import type { StoreThemeTokens } from "./use-store-theme";

export type CssVars = Record<`--${string}`, string>;

export function getFrontstoreCssVars(
  t: StoreThemeTokens,
): React.CSSProperties & CssVars {
  return {
    "--store-pattern-opacity": String(t.patternOpacity),
    "--store-pattern-size-px": `${t.patternSizePx}px`,
    "--store-pattern-base-bg": t.patternBaseBg,
  };
}

