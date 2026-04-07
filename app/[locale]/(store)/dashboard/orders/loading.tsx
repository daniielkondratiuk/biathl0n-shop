import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
      <Skeleton className="h-6 w-48 opacity-70" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full opacity-60" />

      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0">
                <Skeleton className="h-5 w-56 rounded-md opacity-70" />
                <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-md opacity-60" />
                <Skeleton className="mt-3 h-4 w-40 rounded-md opacity-60" />
              </div>
              <div className="flex flex-col items-end">
                <Skeleton className="h-7 w-24 rounded-full opacity-70" />
                <Skeleton className="mt-4 h-9 w-28 rounded-xl opacity-60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
