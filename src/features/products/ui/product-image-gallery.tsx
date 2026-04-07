// src/features/products/ui/product-image-gallery.tsx
"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { SafeImage } from "./safe-image";
import { ProductBadge } from "./product-badge";

interface ProductImage {
  url: string;
  role: "MAIN" | "MAIN_DETAIL" | "GALLERY";
  order: number;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productTitle: string;
  productBadge?: string | null;
  onImageChange?: (index: number) => void;
}

export function ProductImageGallery({
  images,
  productTitle,
  productBadge,
  onImageChange,
}: ProductImageGalleryProps) {
  // Sort images: MAIN first, then MAIN_DETAIL (if exists), then GALLERY by order
  // Filter out MAIN_DETAIL if it doesn't exist to prevent empty slots
  const sortedImages = useMemo(() => {
    const safeImages = Array.isArray(images) ? images : [];
    const sorted = [...safeImages].sort((a, b) => {
      const roleOrder: Record<string, number> = { MAIN: 0, MAIN_DETAIL: 1, GALLERY: 2 };
      const aOrder = roleOrder[a.role] ?? 2;
      const bOrder = roleOrder[b.role] ?? 2;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.order - b.order;
    });
    
    // Ensure MAIN is always first, MAIN_DETAIL second (if exists), then GALLERY
    // This is already handled by the sort, but we verify MAIN exists
    const hasMain = sorted.some((img) => img.role === "MAIN");
    if (!hasMain && sorted.length > 0) {
      // If no MAIN exists but images exist, first image should be MAIN
      // This shouldn't happen if backend validation works, but handle gracefully
      return sorted;
    }
    
    return sorted;
  }, [images]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbnailRailRef = useRef<HTMLDivElement | null>(null);
  const mainImageRef = useRef<HTMLDivElement | null>(null);
  const thumbnailColumnRef = useRef<HTMLDivElement | null>(null);

  // Boundary check: ensure index is always valid
  const safeIndex = useMemo(() => {
    if (sortedImages.length === 0) return 0;
    return Math.max(0, Math.min(selectedImageIndex, sortedImages.length - 1));
  }, [selectedImageIndex, sortedImages.length]);

  // Render guard: clamp index if out of bounds after images change (self-terminating)
  if (selectedImageIndex !== safeIndex) {
    setSelectedImageIndex(safeIndex);
  }

  // Match thumbnail column height to main image height
  useEffect(() => {
    const updateHeight = () => {
      if (mainImageRef.current && thumbnailColumnRef.current) {
        const mainHeight = mainImageRef.current.offsetHeight;
        thumbnailColumnRef.current.style.height = `${mainHeight}px`;
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [sortedImages.length]);

  // Auto-scroll thumbnail rail to keep active thumbnail visible
  useEffect(() => {
    if (thumbnailRefs.current[safeIndex] && thumbnailRailRef.current) {
      thumbnailRefs.current[safeIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [safeIndex]);

  const currentImage = sortedImages[safeIndex];

  const handleThumbnailClick = useCallback((index: number) => {
    if (index >= 0 && index < sortedImages.length) {
      setSelectedImageIndex(index);
      onImageChange?.(index);
    }
  }, [sortedImages.length, onImageChange]);

  if (sortedImages.length === 0 || !currentImage) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-muted">
        <p className="text-sm text-muted-foreground">No images available</p>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .thumb-rail {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .thumb-rail::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
      <div className="flex gap-4 items-start">
        {/* Thumbnail Sidebar */}
        {sortedImages.length > 1 && (
          <div ref={thumbnailColumnRef} className="w-20 shrink-0 flex flex-col">
            <div
              ref={thumbnailRailRef}
              className="thumb-rail h-full overflow-y-auto flex flex-col gap-3"
            >
              {sortedImages.map((img, index) => (
                <div
                  key={`${img.url}-${index}`}
                  ref={(el) => {
                    thumbnailRefs.current[index] = el;
                  }}
                  onClick={() => handleThumbnailClick(index)}
                  className={`
                    relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-transparent
                    cursor-pointer transition-all
                    ${
                      safeIndex === index
                        ? "border-1 border-gray-300 dark:border-gray-600"
                        : "hover:opacity-90"
                    }
                  `}
                >
                  <SafeImage
                    src={img.url}
                    alt={`${productTitle} - Thumbnail ${index + 1}`}
                    fill
                    sizes="128px"
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Image Viewport */}
        <div className="flex-1 flex flex-col">
          <div ref={mainImageRef} className="relative aspect-square w-full">
            <div className="relative w-full h-full overflow-hidden rounded-lg border border-border bg-muted">
              <SafeImage
                src={currentImage.url}
                alt={`${productTitle} - Image ${safeIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 700px"
                loading={safeIndex === 0 ? "eager" : "lazy"}
                priority={safeIndex === 0}
                className="object-cover"
              />

              {/* Badge - always visible on main slider */}
              {productBadge && (
                <ProductBadge badge={productBadge} />
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

