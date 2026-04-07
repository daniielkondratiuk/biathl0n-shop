// src/features/admin/products/ui/form/patch-card-selector.tsx
"use client";

import { useCallback } from "react";
import Image from "next/image";

export interface Patch {
  id: string;
  name: string;
  image: string;
  price: number; // in cents
  isActive?: boolean;
}

interface PatchCardSelectorProps {
  patches: Patch[];
  value: string[]; // selected patch IDs
  onChange: (ids: string[]) => void;
}

export function PatchCardSelector({
  patches,
  value,
  onChange,
}: PatchCardSelectorProps) {
  const handleTogglePatch = useCallback(
    (patchId: string) => {
      if (value.includes(patchId)) {
        // Remove patch
        onChange(value.filter((id) => id !== patchId));
      } else {
        // Add patch
        onChange([...value, patchId]);
      }
    },
    [value, onChange]
  );

  const formatPrice = (priceInCents: number): string => {
    if (priceInCents === 0) {
      return "Free";
    }
    return `€${(priceInCents / 100).toFixed(2)}`;
  };

  if (patches.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No patches available. Create patches first in the admin panel.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {patches.map((patch) => {
        const isSelected = value.includes(patch.id);
        return (
          <div
            key={patch.id}
            onClick={() => handleTogglePatch(patch.id)}
            className={`
              relative flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer
              transition-all duration-200
              ${
                isSelected
                  ? "border-accent bg-accent/5 shadow-sm"
                  : "border-border bg-card hover:border-accent/50 hover:bg-muted/50"
              }
            `}
          >
            {/* Checkbox in top-right corner */}
            <div className="absolute top-2 right-2">
              <div
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center
                  transition-colors
                  ${
                    isSelected
                      ? "bg-accent border-accent"
                      : "bg-background border-border"
                  }
                `}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Patch Image */}
            <div className="w-16 h-16 mb-2 relative rounded overflow-hidden bg-muted flex items-center justify-center">
              {patch.image ? (
                <Image
                  src={patch.image}
                  alt={patch.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="text-xs text-muted-foreground">No image</div>
              )}
            </div>

            {/* Patch Name */}
            <div className="text-sm font-medium text-foreground text-center mb-1 line-clamp-2 min-h-[2.5rem]">
              {patch.name}
            </div>

            {/* Price */}
            <div
              className={`text-xs font-semibold ${
                patch.price === 0
                  ? "text-success"
                  : isSelected
                  ? "text-accent"
                  : "text-muted-foreground"
              }`}
            >
              {formatPrice(patch.price)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

