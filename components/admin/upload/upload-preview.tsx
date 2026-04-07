// components/admin/upload/upload-preview.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UploadPreviewProps {
  url: string;
  onRemove?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  showDragHandle?: boolean;
  className?: string;
}

export function UploadPreview({
  url,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging = false,
  showDragHandle = false,
  className,
}: UploadPreviewProps) {
  const [showControls, setShowControls] = useState(false);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card transition-all",
        isDragging && "opacity-50",
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="relative aspect-square w-full">
        <Image
          src={url}
          alt="Preview"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      {/* Controls overlay */}
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 transition-opacity">
          {showDragHandle && (
            <button
              type="button"
              onMouseDown={onDragStart}
              onMouseUp={onDragEnd}
              className="rounded-md bg-white/90 p-2 text-foreground hover:bg-white transition-colors"
              title="Drag to reorder"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8h16M4 16h16"
                />
              </svg>
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md bg-red-500/90 p-2 text-white hover:bg-red-600 transition-colors"
              title="Remove image"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Drag handle indicator */}
      {showDragHandle && !showControls && (
        <div className="absolute top-2 left-2 rounded-md bg-black/50 p-1.5 text-white">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

