// components/ui/textarea.tsx
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "block w-full rounded-md border border-border bg-input px-3 py-2 text-sm font-normal text-foreground shadow-sm outline-none ring-0 transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-1",
        className,
      )}
      {...props}
    />
  );
}


