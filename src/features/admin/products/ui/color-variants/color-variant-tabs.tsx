// src/features/admin/products/ui/color-variants/color-variant-tabs.tsx
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImageUploader, ProductImage } from "@/features/admin/products/ui/upload/product-image-uploader";
import type { ColorVariantData } from "./color-variant-manager";

type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";
const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

interface Color {
  id: string;
  name: string;
  hex: string;
}

interface ColorVariantTabsProps {
  colorVariants: ColorVariantData[];
  onChange: (colorVariants: ColorVariantData[]) => void;
  colors: Color[];
  productSlug?: string;
}

// Ensure every variant has an id (generate temp id if missing)
function ensureVariantId(variant: ColorVariantData): ColorVariantData {
  if (!variant.id) {
    return {
      ...variant,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
  return variant;
}

export function ColorVariantTabs({
  colorVariants,
  onChange,
  colors,
  productSlug,
}: ColorVariantTabsProps) {
  // Track active tab by variant id (stable identifier)
  const [activeColorId, setActiveColorId] = useState<string | null>(() => {
    // Ensure all variants have ids first
    const variantsWithIds = colorVariants.map((v) => ensureVariantId(v));
    if (variantsWithIds.length > 0 && variantsWithIds[0].id) {
      return variantsWithIds[0].id;
    }
    return null;
  });

  // Ensure all variants have ids (normalize if needed, but don't cause re-renders)
  const normalizedVariants = useMemo(() => {
    return colorVariants.map((v) => ensureVariantId(v));
  }, [colorVariants]);
  
  // Find active variant by id (not index)
  const activeVariant = activeColorId 
    ? normalizedVariants.find(v => v.id === activeColorId) || null
    : null;

  // Update parent if any variants were missing ids (one-time normalization)
  useEffect(() => {
    const needsUpdate = colorVariants.some((v) => {
      const normalized = ensureVariantId(v);
      return !v.id && normalized.id;
    });
    if (needsUpdate) {
      onChange(normalizedVariants);
    }
  }, [colorVariants, normalizedVariants, onChange]);

  // Ensure activeColorId is valid after array changes (render-time sync)
  if (
    activeColorId &&
    !normalizedVariants.some(v => v.id === activeColorId)
  ) {
    const fallback = normalizedVariants[0]?.id ?? null;
    if (fallback !== activeColorId) {
      setActiveColorId(fallback);
    }
  } else if (!activeColorId && normalizedVariants.length > 0) {
    const firstId = normalizedVariants[0]?.id ?? null;
    if (firstId) {
      setActiveColorId(firstId);
    }
  }

  const addColorVariant = useCallback(() => {
    // Generate a unique temporary id for the new variant
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newVariant: ColorVariantData = {
      id: tempId,
      colorId: colors[0]?.id || "",
      priceDiff: 0,
      isActive: true,
      images: [],
      sizes: [],
    };
    const updated = [...normalizedVariants, newVariant];
    onChange(updated);
    // Automatically select the newly created variant
    setActiveColorId(tempId);
  }, [normalizedVariants, colors, onChange]);

  const updateActiveVariant = useCallback((updates: Partial<ColorVariantData>) => {
    if (!activeColorId || !activeVariant) return;
    // Find variant by id (not index) and update it
    const updated = normalizedVariants.map(v => 
      v.id === activeColorId ? { ...v, ...updates } : v
    );
    onChange(updated);
    // activeColorId remains unchanged - it's stable
  }, [normalizedVariants, onChange, activeColorId, activeVariant]);

  const updateActiveVariantImages = useCallback((images: ProductImage[]) => {
    if (!activeColorId || !activeVariant) return;
    // Convert ProductImage[] to API format
    const apiImages = images.map((img, imgIndex) => {
      let role: "MAIN" | "MAIN_DETAIL" | "GALLERY" = "GALLERY";
      if (img.role) {
        role = img.role as "MAIN" | "MAIN_DETAIL" | "GALLERY";
      } else if (img.isMain) {
        role = "MAIN";
      }
      
      return {
        url: img.url,
        role,
        order: imgIndex,
      };
    });
    // Update the specific variant by id - activeColorId stays unchanged
    updateActiveVariant({ images: apiImages });
  }, [activeColorId, activeVariant, updateActiveVariant]);

  const addSize = useCallback(() => {
    if (!activeColorId || !activeVariant) return;
    updateActiveVariant({
      sizes: [
        ...activeVariant.sizes,
        {
          size: "M",
          stock: 10,
        },
      ],
    });
  }, [activeColorId, activeVariant, updateActiveVariant]);

  const removeSize = useCallback((sizeIndex: number) => {
    if (!activeColorId || !activeVariant) return;
    updateActiveVariant({
      sizes: activeVariant.sizes.filter((_, i) => i !== sizeIndex),
    });
  }, [activeColorId, activeVariant, updateActiveVariant]);

  const updateSize = useCallback((sizeIndex: number, updates: Partial<ColorVariantData["sizes"][0]>) => {
    if (!activeColorId || !activeVariant) return;
    const updatedSizes = [...activeVariant.sizes];
    updatedSizes[sizeIndex] = { ...updatedSizes[sizeIndex], ...updates };
    updateActiveVariant({ sizes: updatedSizes });
  }, [activeColorId, activeVariant, updateActiveVariant]);

  const generateDefaultSizes = useCallback(() => {
    if (!activeColorId || !activeVariant) return;
    const newSizes = SIZES.map((size) => {
      // Preserve existing size data if it exists
      const existing = activeVariant.sizes.find(s => s.size === size);
      if (existing) {
        return existing;
      }
      // Create new size with default stock of 10
      return {
        size,
        stock: 10,
      };
    });
    updateActiveVariant({ sizes: newSizes });
  }, [activeColorId, activeVariant, updateActiveVariant]);

  const activeColor = activeVariant ? colors.find((c) => c.id === activeVariant.colorId) : null;

  // Convert active variant images to ProductImage format
  const activeVariantImages: ProductImage[] = activeVariant
    ? activeVariant.images.map((img, idx) => ({
        id: `img-${idx}`,
        url: img.url,
        role: img.role,
        isMain: img.role === "MAIN",
        temp: false,
      }))
    : [];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border">
        {normalizedVariants.map((variant) => {
          const color = colors.find((c) => c.id === variant.colorId);
          // Use variant.id for comparison and React key (NOT index)
          const isActive = variant.id === activeColorId;
          const mainImage = variant.images.find((img) => img.role === "MAIN");

          return (
            <button
              key={variant.id} // Use stable id, not index
              type="button"
              onClick={() => setActiveColorId(variant.id || null)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className="h-4 w-4 rounded border border-border"
                style={{ backgroundColor: color?.hex || "#000000" }}
              />
              <span className="text-sm font-medium whitespace-nowrap">
                {color?.name || "Unknown"}
              </span>
              {mainImage && (
                <span className="text-xs text-green-600 dark:text-green-400">✓</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={addColorVariant}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent"
        >
          + Add Color
        </button>
      </div>

      {/* Tab Content */}
      {activeVariant && activeColorId ? (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          {/* Images Block */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">Images</h3>
            <ProductImageUploader
              images={activeVariantImages}
              onChange={updateActiveVariantImages}
              allowMultiple={true}
              allowRoleSelection={true}
            />
            {activeVariant.images.find((img) => img.role === "MAIN") ? (
              <p className="text-xs text-muted-foreground">✓ MAIN image set</p>
            ) : (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">⚠ MAIN image is required</p>
            )}
          </div>

          {/* Sizes Block */}
          <div className="space-y-4">
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
                >
                  Add Size
                </Button>
              </div>
            </div>

            {activeVariant.sizes.length === 0 ? (
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
                    {activeVariant.sizes.map((size, sizeIndex) => (
                      <tr key={sizeIndex} className="hover:bg-muted/50">
                        <td className="px-4 py-2">
                          <select
                            value={size.size}
                            onChange={(e) =>
                              updateSize(sizeIndex, { size: e.target.value as Size })
                            }
                            className="w-full rounded border border-border bg-input px-2 py-1 text-sm"
                          >
                            {SIZES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            placeholder="Stock"
                            value={size.stock}
                            onChange={(e) =>
                              updateSize(sizeIndex, { stock: parseInt(e.target.value) || 0 })
                            }
                            className="w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {productSlug && activeColor ? (
                            <span className="text-xs text-muted-foreground font-mono">
                              {productSlug}-{activeColor.name.toLowerCase()}-{size.size.toLowerCase()}
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

          {/* Basic Color Settings */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">Basic Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Color *
              </label>
              <select
                value={activeVariant.colorId}
                onChange={(e) => updateActiveVariant({ colorId: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select a color</option>
                {colors.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price Difference (cents)
                </label>
                <Input
                  type="number"
                  value={activeVariant.priceDiff}
                  onChange={(e) => updateActiveVariant({ priceDiff: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id={`active-${activeColorId || 'none'}`}
                  checked={activeVariant.isActive}
                  onChange={(e) => updateActiveVariant({ isActive: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor={`active-${activeColorId || 'none'}`} className="text-sm text-foreground">
                  Active
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No color variants added. Click &quot;+ Add Color&quot; to create one.
          </p>
        </div>
      )}
    </div>
  );
}

