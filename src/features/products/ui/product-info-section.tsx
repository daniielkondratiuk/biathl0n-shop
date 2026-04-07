// src/features/products/ui/product-info-section.tsx
"use client";

import { useState } from "react";

interface ProductInfoSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ProductInfoSection({
  title,
  children,
  defaultOpen = false,
}: ProductInfoSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-6 text-left"
      >
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <svg
          className={`h-5 w-5 text-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-6 text-base leading-relaxed text-foreground">
          {children}
        </div>
      )}
    </div>
  );
}

