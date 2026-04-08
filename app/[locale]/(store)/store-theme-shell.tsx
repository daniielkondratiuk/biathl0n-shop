"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { getFrontstoreCssVars, useStoreThemeTokens } from "@/shared/store-theme";
import { BackgroundParallax } from "@/shared/ui/background-parallax";

export function StoreThemeShell({ children }: { children: React.ReactNode }) {
  const t = useStoreThemeTokens();
  const cssVars = getFrontstoreCssVars(t);
  const pathname = usePathname();
  const isHome = pathname.split("/").filter(Boolean).length === 1;
  const pageSurfaceBg = isHome ? "transparent" : t.pageBg;

  return (
    <div
      data-frontstore-theme="store"
      data-store-theme={t.mode}
      className="relative flex min-h-screen flex-col"
      style={{
        ...cssVars,
        backgroundColor: pageSurfaceBg,
        backgroundImage: "var(--store-bg-image)",
        backgroundSize: "cover",
        backgroundPosition: "top -250px center",
        backgroundRepeat: "no-repeat",
        color: t.textPrimary,
      }}
    >
      <BackgroundParallax
        imageSrc={t.snowImage}
        speed={0.5}
        className="pointer-events-none absolute inset-0 z-0"
        repeat="no-repeat"
        size="contain"
        position="center calc(var(--bg-y, 0) * 1px)"
        baseColor="transparent"
      />
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
}

