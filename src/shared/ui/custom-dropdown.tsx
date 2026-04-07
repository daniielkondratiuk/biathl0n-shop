"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string };

export interface CustomDropdownProps {
  value: string;
  options: readonly DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}

export function CustomDropdown({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: CustomDropdownProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const fallbackLabel = placeholder ?? options[0]?.label ?? "";
  const displayLabel = selectedOption?.label ?? fallbackLabel;

  useEffect(() => {
    if (!isOpen) return;

    const opts: AddEventListenerOptions = { capture: true };
    const onPointerDown = (ev: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const target = ev.target;
      if (!(target instanceof Node)) return;
      if (root.contains(target)) return;
      setIsOpen(false);
      setActiveIndex(-1);
    };

    document.addEventListener("pointerdown", onPointerDown, opts);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, opts);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeIndex < 0 || activeIndex >= options.length) return;
    itemRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen, options.length]);

  const openWithIndex = (index: number) => {
    setIsOpen(true);
    setActiveIndex(index);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const commitSelection = (nextValue: string) => {
    onChange(nextValue);
    closeMenu();
    buttonRef.current?.focus();
  };

  const findStartsWithIndex = (
    dropdownOptions: readonly DropdownOption[],
    char: string
  ): number => {
    const lowerChar = char.trim().toLowerCase();
    if (!lowerChar) return -1;
    for (let i = 0; i < dropdownOptions.length; i += 1) {
      const option = dropdownOptions[i];
      if (option.value.trim() === "") continue;
      const label = option.label.trim().toLowerCase();
      if (label.startsWith(lowerChar)) return i;
    }
    return -1;
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        closeMenu();
      } else {
        openWithIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openWithIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openWithIndex(selectedIndex >= 0 ? selectedIndex : Math.max(options.length - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    if (
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      event.key.length === 1 &&
      /^[a-z0-9]$/i.test(event.key)
    ) {
      const idx = findStartsWithIndex(options, event.key);
      if (idx !== -1) {
        event.preventDefault();
        setActiveIndex(idx);
        const item = itemRefs.current[idx];
        if (item && menuRef.current?.contains(item)) {
          item.scrollIntoView({ block: "nearest" });
        }
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      buttonRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (options.length === 0) return -1;
        if (prev < 0) return 0;
        return (prev + 1) % options.length;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => {
        if (options.length === 0) return -1;
        if (prev < 0) return options.length - 1;
        return (prev - 1 + options.length) % options.length;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < options.length) {
        commitSelection(options[activeIndex].value);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            openWithIndex(selectedIndex >= 0 ? selectedIndex : 0);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-3xl border border-border bg-input px-4 py-2 text-sm font-normal text-foreground shadow-sm outline-none transition-colors focus:outline-none focus:ring-0",
          className
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{displayLabel}</span>
        <svg
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen ? "rotate-180" : "rotate-0"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-2xl border border-border bg-background/95 supports-[backdrop-filter]:bg-background/90 shadow-lg backdrop-blur-md"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <button
                key={option.value || `empty-${index}`}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commitSelection(option.value)}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-white/5",
                  (isSelected || isActive) && "bg-white/10"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
