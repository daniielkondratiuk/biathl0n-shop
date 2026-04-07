// src/features/cart/ui/cart-button.tsx
"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "delete";
  disabled?: boolean;
  "aria-label": string;
}

export function CartButton({
  icon: Icon,
  onClick,
  variant = "default",
  disabled = false,
  "aria-label": ariaLabel,
}: CartButtonProps) {
  const isDelete = variant === "delete";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        // Base styles: square button, rounded corners, border
        "flex h-8 w-8 items-center justify-center rounded-[10px] border transition-colors",
        // Light mode default
        !isDelete && [
          "bg-neutral-100",
          "border-neutral-300",
          "text-neutral-900",
          "hover:bg-neutral-200",
          "active:bg-neutral-300",
        ],
        // Light mode delete
        isDelete && [
          "bg-neutral-100",
          "border-neutral-300",
          "text-red-600",
          "hover:bg-neutral-200",
          "active:bg-neutral-300",
        ],
        // Dark mode default
        !isDelete && [
          "dark:bg-neutral-800",
          "dark:border-neutral-700",
          "dark:text-neutral-100",
          "dark:hover:bg-neutral-700",
          "dark:active:bg-neutral-600",
        ],
        // Dark mode delete
        isDelete && [
          "dark:bg-neutral-800",
          "dark:border-neutral-700",
          "dark:text-red-400",
          "dark:hover:bg-neutral-700",
          "dark:active:bg-neutral-600",
        ],
        // Disabled state
        disabled && [
          "opacity-40",
          "cursor-not-allowed",
          "hover:bg-neutral-100",
          "dark:hover:bg-neutral-800",
        ]
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

