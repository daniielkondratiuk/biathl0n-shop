// components/ui/button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "outline";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const variantClasses =
    variant === "primary"
      ? "bg-accent text-accent-foreground hover:opacity-90 focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
      : "border border-border bg-card text-foreground hover:bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors";

  const sizeClasses =
    size === "sm"
      ? "h-8 px-3 text-xs"
      : "h-10 px-4 text-sm";

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer",
        variantClasses,
        sizeClasses,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}


