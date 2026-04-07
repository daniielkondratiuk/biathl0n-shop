// components/ui/badge.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Star,
  Percent,
  Award,
  Flame,
  RotateCcw,
  CheckCircle,
  Loader2,
  Clock,
  XCircle,
  Undo2,
} from "lucide-react";

type BadgeVariant = 
  // Product badges
  | "limited"
  | "new"
  | "sale"
  | "bestseller"
  | "trending"
  | "backinstock"
  // Order/fulfillment statuses
  | "paid"
  | "processing"
  | "pending"
  | "cancelled"
  | "refunded"
  // Default
  | "default";

type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  showIcon?: boolean;
}

// Icon mapping for each variant
const variantIcons = {
  limited: Sparkles,
  new: Star,
  sale: Percent,
  bestseller: Award,
  trending: Flame,
  backinstock: RotateCcw,
  paid: CheckCircle,
  processing: Loader2,
  pending: Clock,
  cancelled: XCircle,
  refunded: Undo2,
  default: undefined,
};

export function Badge({ 
  children, 
  variant = "default", 
  size = "md",
  className,
  showIcon = true,
}: BadgeProps) {
  // Unified badge style: pure black/white text, more opaque backgrounds, subtle borders
  const variantClasses = {
    // Product badges
    limited: "bg-purple-500/90 dark:bg-purple-500/40",
    new: "bg-blue-500/90 dark:bg-blue-500/40",
    sale: "bg-red-500/90 dark:bg-red-500/40",
    bestseller: "bg-amber-500/90 dark:bg-amber-500/40",
    trending: "bg-pink-500/90 dark:bg-pink-500/40",
    backinstock: "bg-green-600/90 dark:bg-green-600/40",
    // Order/fulfillment statuses
    paid: "bg-green-500/90 dark:bg-green-500/40",
    processing: "bg-blue-500/90 dark:bg-blue-500/40",
    pending: "bg-amber-500/90 dark:bg-amber-500/40",
    cancelled: "bg-red-500/90 dark:bg-red-500/40",
    refunded: "bg-gray-500/90 dark:bg-gray-500/40",
    // Default
    default: "bg-gray-300/90 dark:bg-gray-700/40",
  };

  // Size styles (keep original padding to maintain visual sizes)
  const sizeClasses = {
    sm: "px-1.5 py-0.5",
    md: "px-2 py-1",
    lg: "px-3 py-1.5 text-sm",
  };

  // Icon size based on badge size
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-4 h-4",
  };

  const Icon = variantIcons[variant];

  return (
    <span
      className={cn(
        // Base classes: unified style
        "inline-flex items-center gap-1 rounded-md",
        "text-xs font-semibold leading-none",
        "text-black dark:text-white",
        "border border-black/10 dark:border-white/15",
        "transition-colors",
        // Variant-specific background
        variantClasses[variant],
        // Size classes
        sizeClasses[size],
        className
      )}
    >
      {showIcon && Icon && (
        <Icon className={cn(iconSizes[size], "shrink-0 text-black dark:text-white")} />
      )}
      {children}
    </span>
  );
}
