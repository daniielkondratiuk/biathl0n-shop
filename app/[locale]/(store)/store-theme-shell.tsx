"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { getFrontstoreCssVars, useStoreThemeTokens } from "@/shared/store-theme";

export function StoreThemeShell({ children }: { children: React.ReactNode }) {
  const t = useStoreThemeTokens();
  const cssVars = getFrontstoreCssVars(t);
  const pathname = usePathname();
  const isHome = pathname.split("/").filter(Boolean).length === 1;
  const pageSurfaceBg = isHome ? "transparent" : t.pageBg;

  return (
    <div
      data-frontstore-theme="store"
      className={["flex min-h-screen flex-col", t.isSecondary ? "dark" : ""]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...cssVars,
        backgroundColor: pageSurfaceBg,
        color: t.textPrimary,
      }}
    >
      {children}
    </div>
  );
}

