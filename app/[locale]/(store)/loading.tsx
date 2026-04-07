import { Skeleton } from "@/shared/ui/skeleton";

export default function StoreLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="space-y-3">
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
