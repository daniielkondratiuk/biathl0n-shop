"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

type Slide = {
  id: string;
  imageSrc: string;
  title: string;
  text: string;
};

const SLIDE_INTERVAL_MS = 6000;

type Direction = "prev" | "next";

function ChevronIcon({ direction }: { direction: Direction }) {
  const rotate = direction === "prev" ? "rotate-180" : "";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-8 w-8 ${rotate}`} fill="none">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroSlider() {
  const slides = useMemo<readonly Slide[]>(
    () => [
      {
        id: "slide-1",
        imageSrc: "/hero/1.png",
        title: "NEW COLLECTIONS",
        text: "Minimal design and high quality for everyday wear.",
      },
      {
        id: "slide-2",
        imageSrc: "/hero/2.png",
        title: "MULTIPLE COLORS",
        text: "Clean silhouettes and versatile essentials for every season.",
      },
      {
        id: "slide-3",
        imageSrc: "/hero/3.png",
        title: "NEW COLLECTIONS",
        text: "Minimal design and high quality for everyday wear.",
      },
    ],
    [],
  );

  const autoplay = useRef(
    Autoplay({
      delay: SLIDE_INTERVAL_MS,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  );

  const [viewportRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      containScroll: "trimSnaps",
      duration: 26,
    },
    [autoplay.current],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList().map((_, i) => i));
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const resetAutoplay = useCallback(() => {
    autoplay.current.reset();
  }, []);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
    resetAutoplay();
  }, [emblaApi, resetAutoplay]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
    resetAutoplay();
  }, [emblaApi, resetAutoplay]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
      resetAutoplay();
    },
    [emblaApi, resetAutoplay],
  );

  const goPrev = scrollPrev;
  const goNext = scrollNext;

  return (
    <section className="mt-6 pb-6 sm:mt-8 lg:mt-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative h-[564px] w-full overflow-hidden rounded-2xl sm:h-[580px]">
          {/* Embla viewport */}
          <div ref={viewportRef} className="absolute inset-0 overflow-hidden">
            <div className="flex h-full touch-pan-y">
              {slides.map((slide) => (
                <div key={slide.id} className="relative min-w-0 flex-[0_0_100%]">
                  <Image
                    src={slide.imageSrc}
                    alt=""
                    aria-hidden="true"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Contrast overlay */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Bottom-left text content (synced to selected slide) */}
          <div className="absolute bottom-6 left-6 z-10 md:bottom-8 md:left-8">
            <div className="flex flex-col gap-2">
              <div className="w-fit">
                <span className="inline-block bg-black/70 px-4 py-2 text-4xl font-bold uppercase tracking-tight text-white md:text-5xl lg:text-6xl">
                  {slides[selectedIndex]?.title ?? slides[0]?.title ?? ""}
                </span>
              </div>
              <div className="w-fit">
                <span className="inline-block bg-black/60 px-4 py-2 text-base font-medium text-white/90 md:text-lg lg:text-xl">
                  {slides[selectedIndex]?.text ?? slides[0]?.text ?? ""}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          {slides.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous slide"
                className="absolute left-2 top-1/2 z-20 -translate-y-1/2 p-4 text-white/95 drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:left-4 cursor-pointer"
              >
                <ChevronIcon direction="prev" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next slide"
                className="absolute right-2 top-1/2 z-20 -translate-y-1/2 p-4 text-white/95 drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-4 cursor-pointer"
              >
                <ChevronIcon direction="next" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
                {scrollSnaps.map((idx) => {
                  const isActive = idx === selectedIndex;
                  return (
                    <button
                      key={`dot-${idx}`}
                      type="button"
                      onClick={() => scrollTo(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className="flex h-8 w-8 items-center justify-center cursor-pointer"
                    >
                      <span
                        className={[
                          "block h-2 rounded-full",
                          "transition-[width,background-color] duration-200 ease-out",
                          isActive ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/70",
                        ].join(" ")}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

