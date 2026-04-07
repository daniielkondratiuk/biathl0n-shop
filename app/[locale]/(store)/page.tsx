import type { Metadata } from "next";
import { Suspense } from "react";
import { HomePage } from "@/features/home";
import { Skeleton } from "@/shared/ui/skeleton";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Predators — Custom Streetwear with Animal Patches",
  description:
    "Predators is a streetwear brand offering custom clothing with interchangeable animal patches. Create your own style with bold designs and premium materials.",
};

export default async function Home() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePage />
    </Suspense>
  );
}

function HomePageSkeleton() {
  return (
    <>
      <section className="mt-16 pb-6 sm:mt-20 lg:mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative h-[564px] w-full overflow-hidden rounded-2xl sm:h-[580px]">
            <Skeleton className="absolute inset-0 rounded-2xl opacity-80" />
            <div className="absolute bottom-6 left-6 z-10 md:bottom-8 md:left-8">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-12 w-72 rounded-md opacity-80 md:h-14 md:w-80 lg:h-16 lg:w-96" />
                <Skeleton className="h-8 w-64 rounded-md opacity-80 md:h-10 md:w-72 lg:h-12 lg:w-80" />
                <Skeleton className="mt-2 h-5 w-32 rounded-md opacity-60 md:h-6 md:w-36" />
              </div>
            </div>

            <div className="absolute right-0 top-0 flex h-full w-1/2 items-center justify-center overflow-hidden">
              <div className="relative h-[400px] w-[400px] max-w-[90%] scale-[1.15]">
                <Skeleton className="h-full w-full rounded-2xl opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex items-center justify-between">
            <Skeleton className="h-7 w-40 rounded-md opacity-80" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-2xl opacity-80" />
                <Skeleton className="h-5 w-4/5 rounded-md opacity-80" />
                <Skeleton className="h-4 w-2/3 rounded-md opacity-60" />
                <Skeleton className="h-4 w-24 rounded-md opacity-60" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <Skeleton className="mb-12 h-7 w-44 rounded-md opacity-80" />

          <div className="relative mb-8 block h-[490px] overflow-hidden rounded-lg">
            <Skeleton className="absolute inset-0 rounded-lg opacity-80" />
            <div className="absolute bottom-4 left-4 z-10 md:bottom-6 md:left-6 lg:bottom-8 lg:left-8">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-72 rounded-md opacity-80 md:h-12 md:w-80 lg:h-14 lg:w-96" />
                <Skeleton className="h-7 w-64 rounded-md opacity-60 md:h-8 md:w-72 lg:h-9 lg:w-80" />
                <Skeleton className="h-7 w-56 rounded-md opacity-60 md:h-8 md:w-64 lg:h-9 lg:w-72" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="relative h-[390px] overflow-hidden rounded-lg">
                <Skeleton className="absolute inset-0 rounded-lg opacity-80" />
                <div className="absolute bottom-6 left-6 z-10">
                  <Skeleton className="h-8 w-40 rounded-md opacity-80" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-lg py-24">
            <Skeleton className="absolute inset-0 rounded-lg opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
            <div className="relative z-10 flex items-center">
              <div className="flex max-w-2xl flex-col gap-6 px-8 md:px-12">
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-6 w-56 rounded-md opacity-60" />
                  <Skeleton className="h-10 w-[28rem] max-w-full rounded-md opacity-80" />
                </div>
                <Skeleton className="h-7 w-[32rem] max-w-full rounded-md opacity-60" />
                <Skeleton className="h-10 w-44 rounded-xl opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
