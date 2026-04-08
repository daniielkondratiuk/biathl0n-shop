// src/shared/ui/background-parallax.tsx
"use client";

import { useEffect, useRef } from "react";
import type React from "react";

export type BackgroundParallaxProps = {
  imageSrc?: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  repeat?: React.CSSProperties["backgroundRepeat"];
  size?: React.CSSProperties["backgroundSize"];
  position?: React.CSSProperties["backgroundPosition"];
  baseColor?: string;
};

export function BackgroundParallax({
  imageSrc,
  speed = 0.3,
  className = "pointer-events-none fixed inset-0 -z-10",
  style,
  repeat = "no-repeat",
  size = "cover",
  position = "center",
  baseColor = "transparent",
}: BackgroundParallaxProps) {
  const bgRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0);
  const rafId = useRef<number | null>(null);

  if (!imageSrc) return null;

  useEffect(() => {
    const bgElement = bgRef.current;
    if (!bgElement) return;

    // Update function called via rAF
    const updateBackground = () => {
      if (!bgElement) return;

      // Parallax calculation: scroll-based only
      // Background moves at ~30% of scroll speed
      const bgY = scrollY.current * speed;

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
      className={className}
      aria-hidden="true"
    >
      {/* Pattern overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: baseColor,
          backgroundImage: `url('${imageSrc}')`,
          backgroundRepeat: repeat,
          backgroundSize: size,
          backgroundPosition: position,
          ...style,
        }}
      />
    </div>
  );
}
