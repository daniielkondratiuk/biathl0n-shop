// src/shared/ui/background-parallax.tsx
"use client";

import { useEffect, useRef } from "react";
import { useStoreThemeTokens } from "@/shared/store-theme";

export function BackgroundParallax() {
  const bgRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0);
  const rafId = useRef<number | null>(null);

  // Get theme tokens from single source of truth
  const t = useStoreThemeTokens();

  useEffect(() => {
    const bgElement = bgRef.current;
    if (!bgElement) return;

    // Update function called via rAF
    const updateBackground = () => {
      if (!bgElement) return;

      // Parallax calculation: scroll-based only
      // Background moves at ~30% of scroll speed
      const bgY = scrollY.current * 0.3;

      bgElement.style.setProperty("--bg-y", String(bgY));

      rafId.current = null;
    };

    // Schedule update on next animation frame (debounced)
    const scheduleUpdate = () => {
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(updateBackground);
      }
    };

    // Scroll handler
    const handleScroll = () => {
      scrollY.current = window.scrollY;
      scheduleUpdate();
    };

    // Initial values
    scrollY.current = window.scrollY;
    updateBackground();

    // Add passive scroll listener for performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <div
      ref={bgRef}
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden="true"
    >
      {/* Pattern overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: t.patternBaseBg,
          backgroundImage: "url('/background-main.png')",
          backgroundRepeat: "repeat",
          backgroundSize: `${t.patternSizePx}px ${t.patternSizePx}px`,
          backgroundPosition: "0 calc(var(--bg-y, 0) * 1px)",
          opacity: 0.50,
        }}
      />
      {/* <div className="absolute inset-0 bg-black/40" /> */}
    </div>
  );
}
