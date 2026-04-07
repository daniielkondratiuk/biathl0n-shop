// components/admin/upload/image-upload.tsx
"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "./upload-zone";
import { UploadPreview } from "./upload-preview";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  required = false,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

    try {
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
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  const handleRemove = useCallback(() => {
    onChange("");
    setError(null);
  }, [onChange]);

  return (
    <div className="space-y-3">
      {value ? (
        <div className="space-y-2">
          <UploadPreview url={value} onRemove={handleRemove} />
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="w-full"
            >
              Remove Image
            </Button>
          )}
        </div>
      ) : (
        <UploadZone
          onFilesSelected={handleFilesSelected}
          disabled={disabled || uploading}
          className="min-h-[200px]"
        />
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full animate-pulse bg-accent" />
          </div>
          <p className="text-xs text-muted-foreground">Uploading...</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {required && !value && !uploading && (
        <p className="text-xs text-muted-foreground">Main image is required</p>
      )}
    </div>
  );
}

