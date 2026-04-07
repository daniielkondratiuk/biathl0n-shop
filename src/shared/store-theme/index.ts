// src/shared/store-theme/index.ts
/**
 * Store Theme Module - Single Source of Truth for Frontstore Theme
 *
 * POLICY: Do NOT import useTheme() from next-themes directly in frontstore components.
 * Always use useStoreThemeTokens() from this module instead.
 *
 * This module provides:
 * - useStoreThemeTokens(): Hook returning all theme-dependent values
 * - StoreThemeTokens: TypeScript interface for the tokens object
 * - ResolvedTheme: Type for "light" | "dark"
 */
export { useStoreThemeTokens } from "./tokens";
export type { StoreThemeTokens, ResolvedTheme } from "./tokens";
