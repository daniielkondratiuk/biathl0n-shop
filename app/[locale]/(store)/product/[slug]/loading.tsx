import { Skeleton } from "@/shared/ui/skeleton";

export default function ProductLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <div className="grid gap-4 sm:grid-cols-[5rem_1fr]">
            <div className="hidden flex-col gap-3 sm:flex">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={`aspect-square w-full rounded-xl ${
                    index === 0 ? "opacity-80" : "opacity-60"
                  }`}
                />
              ))}
            </div>
            <Skeleton className="aspect-square w-full rounded-2xl opacity-80" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-5/6 rounded-md opacity-80" />
            <Skeleton className="h-8 w-2/3 rounded-md opacity-60" />
            <Skeleton className="h-5 w-1/3 rounded-md opacity-60" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-8 w-32 rounded-md opacity-80" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full opacity-60" />
              <Skeleton className="h-6 w-16 rounded-full opacity-80" />
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded-md opacity-60" />
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-8 w-8 rounded-full opacity-80"
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-md opacity-60" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-10 w-14 rounded-full opacity-80"
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-full opacity-80" />
            <Skeleton className="h-4 w-1/2 rounded-md opacity-60" />
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded-md opacity-80" />
              <Skeleton className="h-4 w-full rounded-md opacity-60" />
              <Skeleton className="h-4 w-11/12 rounded-md opacity-60" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-md opacity-80" />
              <Skeleton className="h-4 w-10/12 rounded-md opacity-60" />
              <Skeleton className="h-4 w-9/12 rounded-md opacity-60" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-28 rounded-md opacity-80" />
              <Skeleton className="h-4 w-8/12 rounded-md opacity-60" />
            </div>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <Skeleton className="h-7 w-52 rounded-md opacity-80" />
        <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-2xl opacity-80" />
              <Skeleton className="h-4 w-4/5 rounded-md opacity-60" />
              <Skeleton className="h-4 w-3/5 rounded-md opacity-60" />
              <Skeleton className="h-4 w-20 rounded-md opacity-80" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
