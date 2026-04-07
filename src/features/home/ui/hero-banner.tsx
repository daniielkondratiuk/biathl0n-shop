// src/features/home/ui/hero-banner.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

// Type for the product data we need
interface HeroProduct {
  id: string;
  slug: string;
  name: string;
  colorVariants: Array<{
    images: Array<{
      url: string;
      role: string;
      order: number;
    }>;
  }>;
}

interface HeroBannerProps {
  products: HeroProduct[];
}

const SLIDE_INTERVAL = 5000;
const ANIMATION_DURATION = 400; // ms
const WHEEL_THRESHOLD = 40;
const WHEEL_COOLDOWN_MS = 500;
const SWIPE_THRESHOLD = 40;

type Direction = "left" | "right";
type VariantImage = { url: string; role: string; order: number };

// Safe modulo helper for looping indices (handles negative numbers correctly)
const mod = (n: number, m: number): number => ((n % m) + m) % m;

const pickVariantImageUrl = (
  images: readonly VariantImage[] | undefined,
): string | undefined => {
  if (!images || images.length === 0) return undefined;

  const roleBasedMain = images.find((image) => {
    const normalizedRole = image.role.toLowerCase();
    return normalizedRole === "main" || normalizedRole === "primary";
  });
  if (roleBasedMain) return roleBasedMain.url;

  const orderedMain = images.reduce<VariantImage | undefined>((currentBest, image) => {
    if (!currentBest || image.order < currentBest.order) return image;
    return currentBest;
  }, undefined);

  return orderedMain?.url;
};

export function HeroBanner({ products }: HeroBannerProps) {
  const t = useTranslations("home.hero");
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<Direction>("left");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wheelLockRef = useRef(false);
  const wheelUnlockTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Get slides from products
  const slides = products.map((product) => {
    const firstVariant = product.colorVariants?.[0];
    const images = firstVariant?.images ?? [];
    const imageUrl = pickVariantImageUrl(images) ?? "/placeholder.svg";
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl,
    };
  });

  const slideCount = slides.length;

  // Start transition to a new slide
  const goToSlide = useCallback((targetIndex: number, dir?: Direction) => {
    if (isAnimating || targetIndex === activeIndex || slideCount === 0) return;

    // Determine direction if not provided
    const slideDirection = dir ?? (targetIndex > activeIndex ? "left" : "right");

    setDirection(slideDirection);
    setNextIndex(targetIndex);
    setIsAnimating(true);

    // Complete transition after animation duration
    animationTimeoutRef.current = setTimeout(() => {
      setActiveIndex(targetIndex);
      setNextIndex(null);
      setIsAnimating(false);
    }, ANIMATION_DURATION);
  }, [isAnimating, activeIndex, slideCount]);

  // Handle dot click
  const handleDotClick = useCallback((index: number) => {
    if (index === activeIndex) return;
    const dir: Direction = index > activeIndex ? "left" : "right";
    goToSlide(index, dir);
  }, [activeIndex, goToSlide]);

  const goNext = useCallback(() => {
    if (slideCount <= 1) return;
    goToSlide(mod(activeIndex + 1, slideCount), "left");
  }, [activeIndex, slideCount, goToSlide]);

  const goPrev = useCallback(() => {
    if (slideCount <= 1) return;
    goToSlide(mod(activeIndex - 1, slideCount), "right");
  }, [activeIndex, slideCount, goToSlide]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (slideCount <= 1) return;
    if (wheelLockRef.current) return;

    const dy = e.deltaY;
    if (Math.abs(dy) < WHEEL_THRESHOLD) return;

    if (dy > 0) {
      goNext();
    } else {
      goPrev();
    }

    wheelLockRef.current = true;
    if (wheelUnlockTimerRef.current !== null) {
      window.clearTimeout(wheelUnlockTimerRef.current);
    }
    wheelUnlockTimerRef.current = window.setTimeout(() => {
      wheelLockRef.current = false;
      wheelUnlockTimerRef.current = null;
    }, WHEEL_COOLDOWN_MS);
  }, [slideCount, goNext, goPrev]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (slideCount <= 1) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (startX === null || startY === null) return;

    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= SWIPE_THRESHOLD) {
      if (dx < 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  }, [slideCount, goNext, goPrev]);

  const handleTouchMove = useCallback(() => {
    // Intentionally no-op: we only evaluate swipe on touch end.
  }, []);

  const handleTouchCancel = useCallback(() => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }, []);

  // Auto-advance slider (only when multiple slides exist)
  useEffect(() => {
    if (slideCount <= 1) return;

    const interval = setInterval(() => {
      if (!isAnimating) {
        const next = mod(activeIndex + 1, slideCount);
        goToSlide(next, "left");
      }
    }, SLIDE_INTERVAL);

    return () => clearInterval(interval);
  }, [activeIndex, isAnimating, goToSlide, slideCount]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (wheelUnlockTimerRef.current !== null) {
        window.clearTimeout(wheelUnlockTimerRef.current);
      }
    };
  }, []);

  // Get transform styles for slides
  const getSlideStyle = (isActive: boolean, isNext: boolean): React.CSSProperties => {
    if (!isAnimating) {
      // Static state - only show active slide
      return {
        opacity: isActive ? 1 : 0,
        transform: "translateX(0)",
        transition: "none",
      };
    }

    // During animation
    if (isActive) {
      // Current slide exits
      const exitX = direction === "left" ? "-30%" : "30%";
      return {
        opacity: 0,
        transform: `translateX(${exitX})`,
        transition: `opacity ${ANIMATION_DURATION}ms ease-in-out, transform ${ANIMATION_DURATION}ms ease-in-out`,
      };
    }

    if (isNext) {
      // Next slide enters
      return {
        opacity: 1,
        transform: "translateX(0)",
        transition: `opacity ${ANIMATION_DURATION}ms ease-in-out, transform ${ANIMATION_DURATION}ms ease-in-out`,
      };
    }

    // Other slides hidden
    return {
      opacity: 0,
      transform: "translateX(0)",
      transition: "none",
    };
  };

  // Get initial position for next slide (before animation starts)
  const getInitialNextStyle = (): React.CSSProperties => {
    const enterX = direction === "left" ? "30%" : "-30%";
    return {
      opacity: 0,
      transform: `translateX(${enterX})`,
    };
  };

  // If no products, show placeholder
  if (slideCount === 0) {
    return (
      <section className="mt-16 py-6 sm:mt-20 lg:mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <div
            className="relative h-[500px] w-full overflow-hidden rounded-2xl"
            style={{
              backgroundImage: "url('/hero/hero-banner-background.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/20" />
            {/* Bottom-left text content */}
            <div className="absolute bottom-6 left-6 z-10 md:bottom-8 md:left-8">
              <div className="flex flex-col gap-2">
                <div className="w-fit">
                  <span className="inline-block bg-black/70 px-4 py-2 text-4xl font-bold uppercase tracking-tight text-white md:text-5xl lg:text-6xl">
                    {t("titleLine1")}
                  </span>
                </div>
                <div className="w-fit">
                  <span className="inline-block bg-black/70 px-4 py-2 text-xl font-bold uppercase tracking-tight text-white md:text-2xl lg:text-3xl">
                    {t("titleLine2")}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-base font-medium uppercase tracking-widest text-white/90 md:text-lg">
                    {t("seasonLabel")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const activeSlide = slides[activeIndex];
  const nextSlide = nextIndex !== null ? slides[nextIndex] : null;

  return (
    <section className="mt-16 pb-6 sm:mt-20 lg:mt-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Banner Container */}
        <div
          ref={rootRef}
          className="relative h-[564px] w-full overflow-hidden rounded-2xl sm:h-[580px]"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          style={{
            backgroundImage: "url('/hero/hero-banner-background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Dark overlay for text contrast */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Bottom-left text content */}
          <div className="absolute bottom-6 left-6 z-10 md:bottom-8 md:left-8">
            <div className="flex flex-col gap-2">
              {/* NEW COLLECTION */}
              <div className="w-fit">
                <span className="inline-block bg-black/70 px-4 py-2 text-4xl font-bold uppercase tracking-tight text-white md:text-5xl lg:text-6xl">
                  {t("titleLine1")}
                </span>
              </div>
              {/* FAITH INSPIRED ESSENTIALS */}
              <div className="w-fit">
                <span className="inline-block bg-black/70 px-4 py-2 text-xl font-bold uppercase tracking-tight text-white md:text-2xl lg:text-3xl">
                  {t("titleLine2")}
                </span>
              </div>
              {/* SUMMER 2026 */}
              <div className="mt-2">
                <span className="text-base font-medium uppercase tracking-widest text-white/90 md:text-lg">
                  {t("seasonLabel")}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Product slider */}
          <div className="absolute right-0 top-0 flex h-full w-1/2 items-center justify-center overflow-hidden">
            {/* Scaled container for ~15% larger image */}
            <div className="relative h-[400px] w-[400px] max-w-[90%] scale-[1.15]">
              {/* Active slide */}
              <Link
                href={`/product/${activeSlide.slug}`}
                className="absolute inset-0 cursor-pointer"
                style={getSlideStyle(true, false)}
              >
                <Image
                  src={activeSlide.imageUrl}
                  alt={activeSlide.name}
                  fill
                  className="object-contain"
                  priority
                />
              </Link>

              {/* Next slide (only during animation) */}
              {isAnimating && nextSlide !== null && (
                <SlideEnter
                  src={nextSlide.imageUrl}
                  slug={nextSlide.slug}
                  name={nextSlide.name}
                  initialStyle={getInitialNextStyle()}
                  animationDuration={ANIMATION_DURATION}
                />
              )}
            </div>
          </div>

          {/* Dot indicators - centered at bottom */}
          {slideCount > 1 && (
            <DotController
              slideCount={slideCount}
              activeIndex={activeIndex}
              nextIndex={nextIndex}
              isAnimating={isAnimating}
              onDotClick={handleDotClick}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// Separate component to trigger enter animation on mount
function SlideEnter({
  src,
  slug,
  name,
  initialStyle,
  animationDuration,
}: {
  src: string;
  slug: string;
  name: string;
  initialStyle: React.CSSProperties;
  animationDuration: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animation on next frame
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const style: React.CSSProperties = mounted
    ? {
        opacity: 1,
        transform: "translateX(0)",
        transition: `opacity ${animationDuration}ms ease-in-out, transform ${animationDuration}ms ease-in-out`,
      }
    : initialStyle;

  return (
    <Link
      href={`/product/${slug}`}
      className="absolute inset-0 cursor-pointer"
      style={style}
    >
      <Image
        src={src}
        alt={name}
        fill
        className="object-contain"
      />
    </Link>
  );
}

// Constants for dot controller
const MAX_VISIBLE_DOTS = 5;
const DOT_TRANSITION_DURATION = 200; // ms

// Dot controller component - handles both simple (<=5) and infinite (>5) modes
function DotController({
  slideCount,
  activeIndex,
  nextIndex,
  isAnimating,
  onDotClick,
}: {
  slideCount: number;
  activeIndex: number;
  nextIndex: number | null;
  isAnimating: boolean;
  onDotClick: (index: number) => void;
}) {
  const t = useTranslations("home.hero");
  // For <=5 slides, render simple dots
  if (slideCount <= MAX_VISIBLE_DOTS) {
    return (
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
        {Array.from({ length: slideCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => onDotClick(index)}
            disabled={isAnimating}
            className={`flex h-8 w-8 items-center justify-center ${
              isAnimating ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            aria-label={t("goToSlide", { index: index + 1 })}
          >
            <span
              className={`block h-2 rounded-full transition-all duration-200 ${
                index === activeIndex || (isAnimating && index === nextIndex)
                  ? "w-6 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/70"
              }`}
            />
          </button>
        ))}
      </div>
    );
  }

  // For >5 slides, render infinite scrolling dots
  return (
    <InfiniteDotController
      slideCount={slideCount}
      activeIndex={activeIndex}
      nextIndex={nextIndex}
      isAnimating={isAnimating}
      onDotClick={onDotClick}
    />
  );
}

// Infinite dot controller for >5 slides
// Uses a sliding window of 7 dots (1 buffer on each side + 5 visible) with CSS transform animation
// Key: visualActiveIndex updates IMMEDIATELY when activeIndex changes, so dot highlight
// animates in sync with track scroll (no delay).
function InfiniteDotController({
  slideCount,
  activeIndex,
  nextIndex,
  isAnimating,
  onDotClick,
}: {
  slideCount: number;
  activeIndex: number;
  nextIndex: number | null;
  isAnimating: boolean;
  onDotClick: (index: number) => void;
}) {
  const t = useTranslations("home.hero");
  const [trackOffset, setTrackOffset] = useState(0);
  const [isTrackAnimating, setIsTrackAnimating] = useState(false);
  const prevActiveRef = useRef(activeIndex);
  
  // visualActiveIndex: the slide index that should be highlighted RIGHT NOW
  // This updates immediately when activeIndex changes, before the track animation completes
  const [visualActiveIndex, setVisualActiveIndex] = useState(activeIndex);
  
  // Extended indices for smooth animation (7 dots: 1 buffer before, 5 visible, 1 buffer after)
  // Center index is at position 3 in the array
  const getExtendedIndices = useCallback((centerIndex: number): number[] => {
    const indices: number[] = [];
    for (let i = -3; i <= 3; i++) {
      indices.push(mod(centerIndex + i, slideCount));
    }
    return indices;
  }, [slideCount]);

  const [displayIndices, setDisplayIndices] = useState(() => getExtendedIndices(activeIndex));

  // Handle activeIndex changes with animation
  useEffect(() => {
    const prevActive = prevActiveRef.current;
    prevActiveRef.current = activeIndex;

    if (prevActive === activeIndex) return;

    // IMMEDIATELY update visualActiveIndex so dot highlight changes in sync with track
    setVisualActiveIndex(activeIndex);

    // Determine direction of movement
    const forwardDiff = mod(activeIndex - prevActive, slideCount);
    const backwardDiff = mod(prevActive - activeIndex, slideCount);
    
    // Determine if we're moving forward or backward (shortest path)
    const movingForward = forwardDiff <= backwardDiff;
    const steps = movingForward ? forwardDiff : -backwardDiff;

    // For single step movements, animate smoothly
    if (Math.abs(steps) === 1) {
      // Animate the track
      setIsTrackAnimating(true);
      setTrackOffset(steps > 0 ? -1 : 1); // Move track in opposite direction of movement

      // After animation completes, snap back and re-center displayIndices
      // visualActiveIndex stays the same - no second visual change
      setTimeout(() => {
        setIsTrackAnimating(false);
        setTrackOffset(0);
        setDisplayIndices(getExtendedIndices(activeIndex));
      }, DOT_TRANSITION_DURATION);
    } else {
      // For multi-step jumps (clicking non-adjacent dot), just snap immediately
      setDisplayIndices(getExtendedIndices(activeIndex));
      setTrackOffset(0);
    }
  }, [activeIndex, slideCount, getExtendedIndices]);

  // Dot width + gap calculation (h-8 w-8 button with gap-3 = 32px + 12px = 44px per dot)
  const dotStepPx = 44;
  
  // Track transform: offset by trackOffset * dotStepPx
  // Also offset by 1 dot to account for the buffer dot on the left
  const trackTransform = `translateX(${(-1 + trackOffset) * dotStepPx}px)`;

  return (
    <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
      {/* Fixed-width viewport showing 5 dots */}
      <div 
        className="overflow-hidden"
        style={{ width: `${5 * dotStepPx}px` }}
      >
        {/* Sliding track with 7 dots */}
        <div
          className="flex items-center"
          style={{
            transform: trackTransform,
            transition: isTrackAnimating 
              ? `transform ${DOT_TRANSITION_DURATION}ms ease-out` 
              : 'none',
          }}
        >
          {displayIndices.map((slideIndex, displayIdx) => {
            // Check if this dot represents the visually active slide
            // This uses visualActiveIndex which updates IMMEDIATELY, not after animation
            const isActive = slideIndex === visualActiveIndex;
            const isNextTarget = nextIndex !== null && slideIndex === nextIndex;
            
            return (
              <button
                key={`${displayIdx}-${slideIndex}`}
                onClick={() => onDotClick(slideIndex)}
                disabled={isAnimating || isTrackAnimating}
                className={`flex h-8 w-8 shrink-0 items-center justify-center ${
                  isAnimating || isTrackAnimating ? "cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{ marginRight: '12px' }} // gap-3 equivalent
                aria-label={t("goToSlide", { index: slideIndex + 1 })}
              >
                <span
                  className={`block h-2 rounded-full ${
                    isActive || isNextTarget
                      ? "w-6 bg-white"
                      : "w-2 bg-white/50 hover:bg-white/70"
                  }`}
                  style={{
                    // Sync dot size/color transition with track animation
                    transition: `width ${DOT_TRANSITION_DURATION}ms ease-out, background-color ${DOT_TRANSITION_DURATION}ms ease-out`,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
