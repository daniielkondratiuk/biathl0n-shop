// src/features/admin/products/ui/color-variants/color-variant-editor.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImageUploader, ProductImage } from "@/features/admin/products/ui/upload/product-image-uploader";
import { normalizeImageRoles } from "@/lib/utils/image-role-helpers";
import type { ColorVariantData } from "./color-variant-manager";

type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";
// Fixed ordered list of all possible sizes (matching database enum)
const SIZE_ORDER: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];
// Helper function to sort sizes according to SIZE_ORDER
function sortSizes<T extends { size: Size }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)
  );
}

interface Color {
  id: string;
  name: string;
  hex: string;
}

interface ColorVariantEditorProps {
  variant: ColorVariantData;
  colors: Color[];
  productSlug?: string;
  onSave: (variant: ColorVariantData) => void;
  onCancel: () => void;
}

export function ColorVariantEditor({
  variant,
  colors,
  productSlug,
  onSave,
  onCancel,
}: ColorVariantEditorProps) {
  const [localVariant, setLocalVariant] = useState<ColorVariantData>(() => ({
    ...variant,
    sizes: sortSizes(variant.sizes),
  }));
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when a different variant is loaded (render-time sync)
  if (localVariant.id !== variant.id) {
    const sortedVariant = {
      ...variant,
      sizes: sortSizes(variant.sizes),
    };
    setLocalVariant(sortedVariant);
    setHasChanges(false);
  }

  const selectedColor = colors.find(c => c.id === localVariant.colorId);
  const mainImage = localVariant.images.find(img => img.role === "MAIN");
  
  // Check if all sizes exist (for disabling Add Size button)
  const existingSizes = new Set(localVariant.sizes.map(s => s.size));
  const allSizesExist = SIZE_ORDER.every(size => existingSizes.has(size));

  const updateVariant = useCallback((updates: Partial<ColorVariantData>) => {
    setLocalVariant(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleImagesChange = useCallback((images: ProductImage[]) => {
    // Convert ProductImage[] to ImageWithRole format
    const imageRoles = images.map((img, idx) => ({
      url: img.url,
      role: (img.role || (img.isMain ? "MAIN" : "GALLERY")) as "MAIN" | "MAIN_DETAIL" | "GALLERY",
      order: idx,
    }));

    // Normalize roles: ensure MAIN exists, validate MAIN_DETAIL, sort properly
    const normalized = normalizeImageRoles(imageRoles);

    // Convert back to API format
    const apiImages = normalized.map((img) => ({
      url: img.url,
      role: img.role,
      order: img.order,
    }));

    updateVariant({ images: apiImages });
  }, [updateVariant]);

  const addSize = useCallback(() => {
    // Find existing sizes
    const existingSizes = new Set(localVariant.sizes.map(s => s.size));
    
    // Find the first size in SIZE_ORDER that doesn't exist
    const nextSize = SIZE_ORDER.find(size => !existingSizes.has(size));
    
    // If all sizes exist, don't add anything
    if (!nextSize) {
      return;
    }
    
    // Add new size and sort (default stock=10 for new sizes)
    const newSizes = [
      ...localVariant.sizes,
      {
        size: nextSize,
        stock: 10,
      },
    ];
    
    updateVariant({
      sizes: sortSizes(newSizes),
    });
  }, [localVariant.sizes, updateVariant]);

  const removeSize = useCallback((sizeIndex: number) => {
    // Remove size and sort (though order should remain correct)
    const newSizes = localVariant.sizes.filter((_, i) => i !== sizeIndex);
    updateVariant({
      sizes: sortSizes(newSizes),
    });
  }, [localVariant.sizes, updateVariant]);

  const updateSize = useCallback((sizeIndex: number, updates: Partial<ColorVariantData["sizes"][0]>) => {
    const updatedSizes = [...localVariant.sizes];
    updatedSizes[sizeIndex] = { ...updatedSizes[sizeIndex], ...updates };
    // Re-sort after updating (especially if size was changed)
    updateVariant({ sizes: sortSizes(updatedSizes) });
  }, [localVariant.sizes, updateVariant]);

  const generateDefaultSizes = useCallback(() => {
    // Generate all sizes in SIZE_ORDER, preserving existing ones
    const newSizes = SIZE_ORDER.map((size) => {
      // Check if this size already exists
      const existing = localVariant.sizes.find(s => s.size === size);
      if (existing) {
        // Keep existing size with its current values
        return existing;
      }
      // Create new size with default stock of 10
      return {
        size,
        stock: 10,
      };
    });
    // Already sorted by SIZE_ORDER, but apply sortSizes to be safe
    updateVariant({ sizes: sortSizes(newSizes) });
  }, [localVariant.sizes, updateVariant]);

  const handleSave = () => {
    onSave(localVariant);
    setHasChanges(false);
  };

  // Convert variant images to ProductImage format
  const variantImages: ProductImage[] = localVariant.images.map((img, idx) => ({
    id: `img-${idx}`,
    url: img.url,
    role: img.role,
    isMain: img.role === "MAIN",
    temp: false,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg border-2 border-border"
            style={{ backgroundColor: selectedColor?.hex || "#000000" }}
          />
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Edit {selectedColor?.name || "Color"} Variant
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure images, sizes, and pricing for this color
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!hasChanges}>
            Save & Back
          </Button>
        </div>
      </div>

      {/* Images Section */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Images</h3>
        <ProductImageUploader
          images={variantImages}
          onChange={handleImagesChange}
          allowMultiple={true}
          allowRoleSelection={true}
        />
        {mainImage ? (
          <p className="text-xs text-muted-foreground">✓ MAIN image set</p>
        ) : (
          <p className="text-xs text-warning">⚠ MAIN image is required</p>
        )}
      </div>

      {/* Sizes Section */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Sizes</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={generateDefaultSizes}
              variant="ghost"
              size="sm"
            >
              Generate All Sizes
            </Button>
            <Button
              type="button"
              onClick={addSize}
              variant="ghost"
              size="sm"
              disabled={allSizesExist}
            >
              Add Size {allSizesExist && "(All sizes added)"}
            </Button>
          </div>
        </div>

        {localVariant.sizes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sizes added. Click &quot;Generate All Sizes&quot; or &quot;Add Size&quot;.
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-muted overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                    Size
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                    Stock
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                    SKU
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {localVariant.sizes.map((size, sizeIndex) => (
                  <tr key={sizeIndex} className="hover:bg-muted/50">
                    <td className="px-4 py-2">
                      <select
                        value={size.size}
                        onChange={(e) => {
                          const newSize = e.target.value as Size;
                          // Prevent duplicate sizes
                          const isDuplicate = localVariant.sizes.some(
                            (s, idx) => s.size === newSize && idx !== sizeIndex
                          );
                          if (!isDuplicate) {
                            updateSize(sizeIndex, { size: newSize });
                          }
                        }}
                        className="w-full rounded border border-border bg-input px-2 py-1 text-sm"
                      >
                        {SIZE_ORDER.map((s) => {
                          const isDuplicate = localVariant.sizes.some(
                            (existing, idx) => existing.size === s && idx !== sizeIndex
                          );
                          return (
                            <option 
                              key={s} 
                              value={s}
                              disabled={isDuplicate}
                            >
                              {s} {isDuplicate && "(already added)"}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Stock"
                        value={size.stock}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          updateSize(sizeIndex, { stock: Math.max(0, value) });
                        }}
                        onKeyDown={(e) => {
                          // Prevent arrow down from going below 0
                          if (e.key === "ArrowDown" && size.stock <= 0) {
                            e.preventDefault();
                          }
                        }}
                        className="w-24"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {productSlug && selectedColor ? (
                        <span className="text-xs text-muted-foreground font-mono">
                          {productSlug}-{selectedColor.name.toLowerCase()}-{size.size.toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        type="button"
                        onClick={() => removeSize(sizeIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Basic Settings */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Basic Settings</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Price Difference (cents)
            </label>
            <Input
              type="number"
              value={localVariant.priceDiff}
              onChange={(e) => updateVariant({ priceDiff: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="flex items-center gap-2 pt-8">
            <input
              type="checkbox"
              id="isActive"
              checked={localVariant.isActive}
              onChange={(e) => updateVariant({ isActive: e.target.checked })}
              className="rounded border-border"
            />
            <label htmlFor="isActive" className="text-sm text-foreground">
              Active
            </label>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={!hasChanges}>
          Save & Back
        </Button>
      </div>
    </div>
  );
}

