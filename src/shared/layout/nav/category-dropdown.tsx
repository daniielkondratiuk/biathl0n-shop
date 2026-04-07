// src/shared/layout/nav/category-dropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Category } from "@/shared/types/prisma";

interface CategoryDropdownProps {
  categories: Category[];
}

export function CategoryDropdown({ categories }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-base font-medium text-foreground transition hover:text-muted-foreground"
      >
        Categories
        <span className="ml-1 inline-block">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-48 rounded-lg border border-border bg-card shadow-lg">
          <div className="py-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-foreground transition hover:bg-muted"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

