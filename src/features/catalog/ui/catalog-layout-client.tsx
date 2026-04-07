// src/features/catalog/ui/catalog-layout-client.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Category } from "@/shared/types/prisma";
import { FilterPanel } from "./filters/filter-panel";
import { FilterDrawer } from "./filters/filter-drawer";
import { FilterToggle } from "./filters/filter-toggle";
import { useStoreThemeTokens } from "@/shared/store-theme";
import { useTranslations } from "next-intl";

interface Color {
  id: string;
  name: string;
  slug: string;
  hex: string;
}

interface CatalogLayoutClientProps {
  categories: Category[];
  colors?: Color[];
  total: number;
  children: React.ReactNode;
}

// Media query breakpoint (lg = 1024px)
const LG_BREAKPOINT = 1024;

// Solid background colors matching header/footer
const PANEL_COLORS = {
  light: "#f9f9f3",
  dark: "#20223c",
} as const;

export function CatalogLayoutClient({
  categories,
  colors = [],
  total,
  children,
}: CatalogLayoutClientProps) {
  const t = useTranslations("catalog");
  const { isDark, mounted } = useStoreThemeTokens();

  // Desktop sidebar state (persists) - closed by default
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  // Mobile drawer state (ephemeral)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  // Track if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < LG_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Render guard: close mobile drawer when switching to desktop (self-terminating)
  if (!isMobile && isMobileDrawerOpen) {
    setIsMobileDrawerOpen(false);
  }

  const toggleFilters = useCallback(() => {
    if (isMobile) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsDesktopFilterOpen((prev) => !prev);
    }
  }, [isMobile]);

  const closeMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
  }, []);

  // For the toggle button, show current state based on device
  const isFilterVisible = isMobile ? isMobileDrawerOpen : isDesktopFilterOpen;

  // Solid background style (matching header/footer)
  const panelStyle = mounted
    ? { backgroundColor: isDark ? PANEL_COLORS.dark : PANEL_COLORS.light }
    : undefined;

  return (
    <div className="flex flex-1 flex-col">
      {/* Toggle row */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:px-8">
        <FilterToggle isOpen={isFilterVisible} onToggle={toggleFilters} />
        <span className="text-sm text-muted-foreground">
          {total} {total === 1 ? t("product") : t("products")}
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1">
        {/* Desktop filter panel - animated slide */}
        <aside
          id="catalog-filter-panel"
          className={`hidden lg:block border-r border-border overflow-hidden transition-all duration-300 ease-in-out ${
            isDesktopFilterOpen ? "w-[240px] opacity-100" : "w-0 opacity-0"
          }`}
          style={panelStyle}
        >
          <div
            className={`w-[240px] h-full transition-transform duration-300 ease-in-out ${
              isDesktopFilterOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <FilterPanel categories={categories} colors={colors} />
          </div>
        </aside>

        {/* Product grid area */}
        <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </div>

      {/* Mobile drawer (only rendered on mobile) */}
      <FilterDrawer
        isOpen={isMobileDrawerOpen}
        onClose={closeMobileDrawer}
        categories={categories}
        colors={colors}
      />
    </div>
  );
}
