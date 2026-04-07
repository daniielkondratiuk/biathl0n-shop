// components/catalog/filter-section.tsx
"use client";

import { useState } from "react";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="relative h-[14px] w-[14px] shrink-0">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-foreground"
      >
        {isOpen ? (
          // Up chevron (expanded)
          <path
            d="M0.66 3.07L7 7L13.34 3.07"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          // Down chevron (collapsed)
          <path
            d="M0.66 10.93L7 7L13.34 10.93"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

export function FilterSection({
  title,
  children,
  defaultOpen = true,
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-[18px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between"
        type="button"
      >
        <span className="text-base font-medium leading-5 text-foreground">
          {title}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3">{children}</div>
      )}
    </div>
  );
}

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FilterCheckbox({
  label,
  checked,
  onChange,
}: FilterCheckboxProps) {
  return (
    <label className="flex w-full cursor-pointer items-center gap-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border border-neutral-400 bg-background text-primary transition-colors checked:bg-primary checked:border-primary focus:ring-1 focus:ring-ring focus:ring-offset-1 dark:border-neutral-600 dark:bg-neutral-900 dark:checked:bg-primary dark:checked:border-primary"
      />
      <span className="text-base font-normal leading-6 text-foreground">
        {label}
      </span>
    </label>
  );
}
