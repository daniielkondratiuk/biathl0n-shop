import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-5 w-96" />

      <div className="mt-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28" />
        ))}
      </div>

      <Skeleton className="mt-6 h-[420px] w-full" />
    </div>
  );
}
