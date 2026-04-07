// components/ui/input.tsx
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "block w-full rounded-3xl border border-border bg-input px-3 py-2 text-sm font-normal text-foreground shadow-sm outline-none ring-0 transition placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:ring-offset-1",
        className,
      )}
      {...props}
    />
  );
}


