// src/features/catalog/ui/filters/filter-section.tsx
"use client";

import { useState, useId } from "react";
import { useTranslations } from "next-intl";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-foreground transition-transform duration-200 ${
        isOpen ? "rotate-180" : "rotate-0"
      }`}
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FilterSection({
  title,
  children,
  defaultOpen = false,
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col overflow-visible">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-1"
        type="button"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out overflow-visible ${
          isOpen
            ? "grid-rows-[1fr] opacity-100 mt-4"
            : "grid-rows-[0fr] opacity-0 mt-0"
        }`}
      >
        <div className={`${isOpen ? "overflow-visible" : "overflow-hidden"} min-h-0`}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export function FilterCheckbox({
  label,
  checked,
  onChange,
}: FilterCheckboxProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 group select-none"
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
          checked
            ? "border-foreground bg-foreground"
            : "border-muted-foreground bg-background group-hover:border-foreground"
        }`}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-background"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

interface Color {
  id: string;
  name: string;
  slug: string;
  hex: string;
}

interface FilterColorSwatchesProps {
  colors: Color[];
  selected: string[];
  onToggle: (slug: string) => void;
}

export function FilterColorSwatches({
  colors,
  selected,
  onToggle,
}: FilterColorSwatchesProps) {
  return (
    <div className="flex flex-wrap -m-1.5 overflow-visible">
      {colors.map((color) => {
        const isSelected = selected.includes(color.slug);
        return (
          <div key={color.id} className="p-1.5">
            <button
              type="button"
              onClick={() => onToggle(color.slug)}
              title={color.name}
              className={`
                h-7 w-7 rounded-full transition-all duration-150 ease-out cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2
                ${
                  isSelected
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                    : "hover:scale-105 ring-1 ring-border"
                }
              `}
              style={{ backgroundColor: color.hex }}
              aria-pressed={isSelected}
              aria-label={`${color.name}${isSelected ? " (selected)" : ""}`}
            />
          </div>
        );
      })}
    </div>
  );
}

interface FilterSizePillsProps {
  sizes: string[];
  selected: string[];
  onToggle: (size: string) => void;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export function FilterSizePills({
  sizes,
  selected,
  onToggle,
}: FilterSizePillsProps) {
  const sortedSizes = [...sizes].sort(
    (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
  );

  return (
    <div className="flex flex-wrap gap-2">
      {sortedSizes.map((size) => {
        const isSelected = selected.includes(size);
        return (
          <button
            key={size}
            type="button"
            onClick={() => onToggle(size)}
            className={`
              h-9 px-3 rounded border text-sm font-medium transition-all cursor-pointer
              ${
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/50"
              }
            `}
            aria-pressed={isSelected}
          >
            {size}
          </button>
        );
      })}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  const t = useTranslations("filters");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
        aria-label={t("removeFilter", { label })}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 3L3 9M3 3L9 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </span>
  );
}

interface FilterRadioProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}

export function FilterRadio({
  name,
  value,
  label,
  checked,
  onChange,
}: FilterRadioProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 group select-none"
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          checked
            ? "border-foreground"
            : "border-muted-foreground group-hover:border-foreground"
        }`}
      >
        {checked && <div className="h-2.5 w-2.5 rounded-full bg-foreground" />}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
