// src/features/catalog/ui/filters/filter-drawer.tsx
"use client";

import { useEffect, useCallback } from "react";
import type { Category } from "@/shared/types/prisma";
import { FilterPanel } from "./filter-panel";
import { useStoreThemeTokens } from "@/shared/store-theme";
import { useTranslations } from "next-intl";

interface Color {
  id: string;
  name: string;
  slug: string;
  hex: string;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  colors?: Color[];
}

export function FilterDrawer({
  isOpen,
  onClose,
  categories,
  colors = [],
}: FilterDrawerProps) {
  const t = useTranslations("filters");
  const themeTokens = useStoreThemeTokens();

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Lock body scroll and listen for escape when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleEscape]);

  const panelStyle = themeTokens.mounted
    ? {
        backgroundColor: "var(--store-filter-panel-bg)",
        color: themeTokens.textPrimary,
        borderColor: themeTokens.border,
      }
    : undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-full max-w-[240px] border-r border-border shadow-xl transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={t("filterProducts")}
      >
        <FilterPanel categories={categories} colors={colors} onClose={onClose} isMobile />
      </div>
    </>
  );
}
