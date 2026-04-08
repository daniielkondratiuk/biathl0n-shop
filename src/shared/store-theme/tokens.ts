// src/shared/store-theme/tokens.ts
export { useStoreThemeTokens } from "./use-store-theme";
export type { StoreThemeTokens, ResolvedTheme } from "./use-store-theme";

declare module "./use-store-theme" {
  interface StoreThemeTokens {
    headerBg: string;
    headerText: string;
    navLinkBg: string;
    footerBg: string;
    footerText: string;
  }
}
