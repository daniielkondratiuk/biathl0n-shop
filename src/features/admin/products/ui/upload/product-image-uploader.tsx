// src/features/admin/products/ui/upload/product-image-uploader.tsx
"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { handleImageDeletion, normalizeImageRoles } from "@/lib/utils/image-role-helpers";

export interface ProductImage {
  id: string;
  url: string;
  isMain?: boolean; // Legacy support
  role?: "MAIN" | "MAIN_DETAIL" | "GALLERY"; // New role-based
  temp?: boolean;
  filename?: string;
}

interface ProductImageUploaderProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  disabled?: boolean;
  allowMultiple?: boolean;
  allowRoleSelection?: boolean; // Enable role selection UI
}

export function ProductImageUploader({
  images,
  onChange,
  disabled = false,
  allowMultiple = true,
  allowRoleSelection = false,
}: ProductImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0 || disabled) return;

    // Track all uploads
    const uploadIds = files.map((_, index) => `upload-${Date.now()}-${index}`);
    setUploading((prev) => [...prev, ...uploadIds]);

    try {
      // Upload all files at once
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/upload/temp-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Upload failed");
      }

      const uploadedImages: unknown = await res.json();
      
      type UploadedImage = { id?: string; url?: string; path?: string; temp?: boolean; filename?: string };
      
      // uploadedImages is an array of image objects
      const newImages: UploadedImage[] = (Array.isArray(uploadedImages) ? uploadedImages : [uploadedImages]) as UploadedImage[];
      
      // Filter out duplicates (by URL) and append to existing images
      const existingUrls = new Set(images.map((img) => img.url));
      const uniqueNewImages = newImages.filter((img) => !existingUrls.has(img.url || img.path || ""));
      
      // Check if MAIN already exists
      const hasMain = images.some((img) => img.role === "MAIN" || img.isMain);
      
      // All newly uploaded images default to GALLERY role
      // BUT: if no MAIN exists, first new image becomes MAIN
      const finalNewImages: ProductImage[] = uniqueNewImages.map((img, index) => {
        const isFirstNewImage = index === 0 && !hasMain;
        return {
          id: img.id || `img-${Date.now()}-${index}`,
          url: img.url || img.path || "",
          isMain: isFirstNewImage, // First new image becomes MAIN if no MAIN exists
          role: isFirstNewImage ? "MAIN" : "GALLERY", // First new image becomes MAIN if no MAIN exists
          temp: img.temp !== false, // Assume temp unless explicitly false
          filename: img.filename,
        };
      });

      const updatedImages: ProductImage[] = [...images, ...finalNewImages];
      onChange(updatedImages);
    } catch (err) {
      console.error("Upload error:", err);
      // Could show toast here
    } finally {
      setUploading((prev) => prev.filter((id) => !uploadIds.includes(id)));
    }
  }, [images, onChange, disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      handleFilesSelected(files);
    }
  }, [disabled, handleFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      handleFilesSelected(files);
    }

    // Reset input
    e.target.value = "";
  }, [handleFilesSelected]);

  const handleDelete = useCallback(async (image: ProductImage) => {
    // If it's a temp file, delete from server
    if (image.temp && image.filename) {
      try {
        await fetch(`/api/upload/temp/${image.filename}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete temp file:", err);
      }
    } else if (!image.temp) {
      // If it's an existing image, delete from product directory
      // Extract productId from URL: /uploads/products/{productId}/{filename}
      const urlParts = image.url.split("/");
      const productIdIndex = urlParts.indexOf("products");
      if (productIdIndex >= 0 && urlParts[productIdIndex + 1]) {
        const productId = urlParts[productIdIndex + 1];
        try {
          await fetch(`/api/products/${productId}/images`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: image.url }),
          });
        } catch (err) {
          console.error("Failed to delete product image:", err);
        }
      }
    }

    // Convert to ImageWithRole format for proper deletion handling
    const imageRoles = images.map((img) => ({
      url: img.url,
      role: (img.role || (img.isMain ? "MAIN" : "GALLERY")) as "MAIN" | "MAIN_DETAIL" | "GALLERY",
      order: 0,
    }));

    const deletedImageRole = {
      url: image.url,
      role: (image.role || (image.isMain ? "MAIN" : "GALLERY")) as "MAIN" | "MAIN_DETAIL" | "GALLERY",
      order: 0,
    };

    // Use helper to handle deletion properly (auto-assign MAIN if needed)
    const remaining = handleImageDeletion(imageRoles, deletedImageRole);
    const normalized = normalizeImageRoles(remaining);

    // Convert back to ProductImage format
    const newImages: ProductImage[] = normalized.map((img, idx) => ({
      id: `img-${idx}`,
      url: img.url,
      isMain: img.role === "MAIN",
      role: img.role,
      temp: images.find((i) => i.url === img.url)?.temp ?? false,
      filename: images.find((i) => i.url === img.url)?.filename,
    }));

    onChange(newImages);
  }, [images, onChange]);

  const handleSetMain = useCallback((imageId: string) => {
    // Ensure only one image is marked as MAIN
    // When setting MAIN, remove MAIN from all others but keep MAIN_DETAIL if it's on a different image
    const newImages: ProductImage[] = images.map((img) => {
      if (img.id === imageId) {
        return { ...img, isMain: true, role: "MAIN" };
      }
      // Remove MAIN role from other images, but preserve MAIN_DETAIL if it's on a different image
      if (img.role === "MAIN") {
        return { ...img, isMain: false, role: "GALLERY" };
      }
      return img;
    });
    onChange(newImages);
  }, [images, onChange]);

  const handleSetRole = useCallback((imageId: string, role: "MAIN" | "MAIN_DETAIL" | "GALLERY") => {
    // Check if MAIN exists (for MAIN_DETAIL validation)
    const hasMain = images.some(img => (img.role === "MAIN" || img.isMain) && img.id !== imageId);
    
    // Block MAIN_DETAIL if no MAIN exists
    if (role === "MAIN_DETAIL" && !hasMain) {
      return; // Don't allow MAIN_DETAIL without MAIN
    }
    
    // Convert to ImageWithRole format
    const imageRoles = images.map((img) => ({
      url: img.url,
      role: (img.role || (img.isMain ? "MAIN" : "GALLERY")) as "MAIN" | "MAIN_DETAIL" | "GALLERY",
      order: 0,
    }));

    // Update the role for the selected image
    const updated = imageRoles.map((img) => {
      const matchingImage = images.find((i) => i.url === img.url);
      if (matchingImage?.id === imageId) {
        return { ...img, role };
      }
      // If setting a new MAIN, clear old MAIN from all others
      if (role === "MAIN" && img.role === "MAIN") {
        return { ...img, role: "GALLERY" };
      }
      // If setting a new MAIN_DETAIL, clear old MAIN_DETAIL from all others
      if (role === "MAIN_DETAIL" && img.role === "MAIN_DETAIL") {
        return { ...img, role: "GALLERY" };
      }
      return img;
    });

    // Normalize roles (ensure MAIN exists, validate MAIN_DETAIL, sort)
    const normalized = normalizeImageRoles(updated as Parameters<typeof normalizeImageRoles>[0]);

    // Convert back to ProductImage format
    const newImages: ProductImage[] = normalized.map((img, idx) => {
      const originalImage = images.find((i) => i.url === img.url);
      return {
        id: originalImage?.id || `img-${idx}`,
        url: img.url,
        isMain: img.role === "MAIN",
        role: img.role,
        temp: originalImage?.temp ?? false,
        filename: originalImage?.filename,
      };
    });

    onChange(newImages);
  }, [images, onChange]);

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border bg-muted/50 hover:border-accent/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple={allowMultiple}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <svg
            className="mb-3 h-10 w-10 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-1 text-sm font-medium text-foreground">
            {isDragging ? "Drop images here" : "Drag & drop images here"}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            JPG, PNG, WebP up to 10MB
          </p>
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={image.url}
                  alt="Product image"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                
                {/* Role Badge */}
                {(image.isMain || image.role === "MAIN") && (
                  <div className="absolute top-2 left-2 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                    MAIN
                  </div>
                )}
                {image.role === "MAIN_DETAIL" && (
                  <div className="absolute top-2 left-2 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                    DETAIL
                  </div>
                )}
                {image.role === "GALLERY" && allowRoleSelection && (
                  <div className="absolute top-2 left-2 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    GALLERY
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 transition-all group-hover:bg-black/50">
                  {allowRoleSelection ? (
                    <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <select
                        value={image.role || "GALLERY"}
                        onChange={(e) => handleSetRole(image.id, e.target.value as "MAIN" | "MAIN_DETAIL" | "GALLERY")}
                        disabled={disabled}
                        className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="GALLERY">Gallery</option>
                        <option value="MAIN">Main</option>
                        <option 
                          value="MAIN_DETAIL" 
                          disabled={!images.some(img => (img.role === "MAIN" || img.isMain) && img.id !== image.id)}
                        >
                          Main Detail {!images.some(img => (img.role === "MAIN" || img.isMain) && img.id !== image.id) && "(Requires MAIN)"}
                        </option>
                      </select>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetMain(image.id)}
                      disabled={disabled || image.isMain || image.role === "MAIN"}
                      className={cn(
                        "opacity-0 transition-opacity group-hover:opacity-100",
                        (image.isMain || image.role === "MAIN") && "opacity-100 bg-accent text-accent-foreground"
                      )}
                      title={(image.isMain || image.role === "MAIN") ? "Main image" : "Set as main image"}
                    >
                      <svg
                        className="h-4 w-4"
                        fill={(image.isMain || image.role === "MAIN") ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(image)}
                    disabled={disabled}
                    className="opacity-0 transition-opacity group-hover:opacity-100 bg-red-500/90 text-white hover:bg-red-600"
                    title="Delete image"
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Uploading {uploading.length} image{uploading.length > 1 ? "s" : ""}...
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full animate-pulse bg-accent" />
          </div>
        </div>
      )}

      {images.length === 0 && !uploading.length && (
        <p className="text-xs text-muted-foreground text-center">
          No images added yet. Upload at least one image and mark it as main.
        </p>
      )}
    </div>
  );
}

