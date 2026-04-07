// src/features/products/ui/product-badge.tsx
"use client";

import { Badge } from "@/components/ui/badge";

interface ProductBadgeProps {
  badge: string | null | undefined;
  size?: "sm" | "md" | "lg";
}

const BADGE_LABELS: Record<string, string> = {
  NEW: "New",
  BESTSELLER: "Best Seller",
  SALE: "Sale",
  LIMITED: "Limited",
  BACKINSTOCK: "Back in Stock",
  TRENDING: "Trending",
};

const BADGE_VARIANTS: Record<string, "limited" | "new" | "sale" | "bestseller" | "trending" | "backinstock" | "default"> = {
  NEW: "new",
  LIMITED: "limited",
  SALE: "sale",
  BESTSELLER: "bestseller",
  TRENDING: "trending",
  BACKINSTOCK: "backinstock",
};

export function ProductBadge({ badge, size = "md" }: ProductBadgeProps) {
  if (!badge) {
    return null;
  }

  const label = BADGE_LABELS[badge] || badge;
  const variant = BADGE_VARIANTS[badge] || "default";

  return (
    <div className="absolute top-4 left-4 z-30 drop-shadow-md">
      <Badge variant={variant} size={size} showIcon={true}>
        {label}
      </Badge>
    </div>
  );
}

