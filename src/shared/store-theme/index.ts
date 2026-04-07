// src/shared/store-theme/index.ts
/**
 * Frontstore Theme Module - Single Source of Truth for frontstore theme.
 *
 * Project-facing modes are `theme_first` / `theme_secondary`.
 * Any light/dark implementation details are contained within this module.
 */
export { useStoreThemeTokens } from "./use-store-theme";
export type { StoreThemeTokens, ResolvedTheme } from "./use-store-theme";
export { useFrontstoreThemeMode } from "./mode";
export type { FrontstoreThemeMode } from "./mode";
export { getFrontstoreCssVars } from "./css-vars";
export { getFrontstorePrimary } from "./values";
