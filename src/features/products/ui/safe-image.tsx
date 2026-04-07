// src/features/products/ui/safe-image.tsx
"use client";

import { useState } from "react";
import Image from "next/image";

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
}

const DEFAULT_PLACEHOLDER = "/placeholder.svg";

export function SafeImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = "",
  placeholder = DEFAULT_PLACEHOLDER,
  sizes,
  loading,
  priority,
}: SafeImageProps) {
  const [prevSrc, setPrevSrc] = useState(src);
  const [imgSrc, setImgSrc] = useState<string | null>(() => src ?? null);
  const [hasError, setHasError] = useState(false);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setImgSrc(src ?? null);
    setHasError(false);
  }

  const isLocal = imgSrc?.startsWith("/");

  const computedSizes = fill
    ? sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
    : undefined;

  const computedWidth = fill ? undefined : width || 400;
  const computedHeight = fill ? undefined : height || 400;

  // If no src and no placeholder, show empty div
  if (!src && !placeholder) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
      >
        <span className="text-xs">No image</span>
      </div>
    );
  }

  // If error or no src, show placeholder
  if (hasError || !imgSrc) {
    return (
      <div className={`relative ${fill ? "w-full h-full" : ""} ${className}`}>
        <Image
          src={placeholder}
          alt={alt}
          fill={fill}
          width={computedWidth}
          height={computedHeight}
          className={className}
          sizes={computedSizes}
          loading={loading}
          priority={priority}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={`relative ${fill ? "w-full h-full" : ""}`}>
      <Image
        src={imgSrc}
        alt={alt}
        fill={fill}
        width={computedWidth}
        height={computedHeight}
        className={className}
        sizes={computedSizes}
        loading={loading}
        priority={priority}
        unoptimized={isLocal}
        loader={isLocal ? () => imgSrc : undefined}
        onError={() => {
          if (!hasError) {
            setHasError(true);
            setImgSrc(null);
          }
        }}
      />
    </div>
  );
}
