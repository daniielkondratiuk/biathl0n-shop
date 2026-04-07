import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse bg-white/10", className)}
    />
  );
}
