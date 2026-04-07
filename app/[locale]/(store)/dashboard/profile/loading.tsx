import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Skeleton className="h-7 w-40" />

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-11 w-full rounded-3xl" />
          </div>
        ))}
      </div>

      <Skeleton className="mt-6 h-11 w-40" />
    </div>
  );
}
