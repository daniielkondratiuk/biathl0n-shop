"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "./upload-zone";
import { ReorderableGrid } from "./reorderable-grid";

interface GalleryUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

interface UploadProgress {
  file: File;
  progress: number;
  url?: string;
  error?: string;
}

/**
 * Commits all `/temp/` images to `/uploads/products/<productId>/`.
 *
 * Call this with the productId BEFORE persisting the product payload.
 * Already-committed URLs (`/uploads/...`) are returned unchanged.
 *
 * @returns A new URL array where every `/temp/` URL has been replaced
 *          with its permanent `/uploads/products/...` counterpart.
 * @throws  If the commit API call fails (temp state is NOT wiped).
 */
export async function commitTempImages(
  productId: string,
  urls: string[]
): Promise<string[]> {
  const tempUrls = urls.filter((u) => u.startsWith("/temp/"));

  if (tempUrls.length === 0) {
    return urls;
  }

  const filenames = tempUrls.map((u) => u.split("/temp/")[1]);

  const res = await fetch("/api/upload/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, filenames }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to commit images");
  }

  const { urls: finalUrls } = (await res.json()) as { urls: string[] };

  const mapping = new Map<string, string>();
  tempUrls.forEach((tempUrl, i) => {
    mapping.set(tempUrl, finalUrls[i]);
  });

  return urls.map((u) => mapping.get(u) ?? u);
}

/** Returns true when at least one URL is still in `/temp/`. */
export function hasTempImages(urls: string[]): boolean {
  return urls.some((u) => u.startsWith("/temp/"));
}

export function GalleryUpload({
  value,
  onChange,
  disabled = false,
}: GalleryUploadProps) {
  const [uploading, setUploading] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || "Upload failed");
    }

    const data = await res.json();
    return data.url;
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0 || disabled) return;

    setError(null);
    const newUploads: UploadProgress[] = files.map((file) => ({
      file,
      progress: 0,
    }));
    setUploading(newUploads);

    try {
      const uploadPromises = files.map(async (file, index) => {
        try {
          const url = await uploadFile(file);
          setUploading((prev) =>
            prev.map((u, i) => (i === index ? { ...u, url, progress: 100 } : u))
          );
          return url;
        } catch (err) {
          setUploading((prev) =>
            prev.map((u, i) =>
              i === index
                ? {
                    ...u,
                    error: err instanceof Error ? err.message : "Upload failed",
                  }
                : u
            )
          );
          return null;
        }
      });

      const urls = (await Promise.all(uploadPromises)).filter(
        (url): url is string => url !== null
      );

      onChange([...value, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setTimeout(() => {
        setUploading([]);
      }, 2000);
    }
  }, [value, onChange, uploadFile, disabled]);

  const handleRemove = useCallback(
    (url: string) => {
      onChange(value.filter((u) => u !== url));
    },
    [value, onChange]
  );

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      onChange(newOrder);
    },
    [onChange]
  );

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <ReorderableGrid
          items={value}
          onReorder={handleReorder}
          onRemove={handleRemove}
          disabled={disabled}
        />
      )}

      <UploadZone
        onFilesSelected={handleFilesSelected}
        multiple
        disabled={disabled || uploading.length > 0}
        className="min-h-[150px]"
      />

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((upload, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">
                  {upload.file.name}
                </span>
                {upload.url ? (
                  <span className="text-green-600">Done</span>
                ) : upload.error ? (
                  <span className="text-red-600">Failed</span>
                ) : (
                  <span className="text-muted-foreground">Uploading...</span>
                )}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{
                    width: upload.url
                      ? "100%"
                      : upload.error
                      ? "0%"
                      : `${upload.progress}%`,
                  }}
                />
              </div>
              {upload.error && (
                <p className="text-xs text-danger">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
