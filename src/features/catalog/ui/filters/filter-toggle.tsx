// src/features/catalog/ui/filters/filter-toggle.tsx
"use client";

import { useTranslations } from "next-intl";

interface FilterToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

export function FilterToggle({ isOpen, onToggle }: FilterToggleProps) {
  const t = useTranslations("filters");
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
      aria-expanded={isOpen}
      aria-controls="catalog-filter-panel"
    >
      <FilterIcon />
      <span>{isOpen ? t("hideFilters") : t("showFilters")}</span>
    </button>
  );
}
