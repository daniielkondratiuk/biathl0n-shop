import { cn } from "@/lib/utils";

interface CenteredLoaderProps {
  text: string;
  className?: string;
}

export function CenteredLoader({
  text,
  className,
}: CenteredLoaderProps): React.ReactElement {
  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10", className)}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60"
        />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
