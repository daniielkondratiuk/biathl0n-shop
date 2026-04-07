// src/features/admin/products/ui/color-variants/color-variant-overview.tsx
"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ColorVariantData } from "./color-variant-manager";

interface Color {
  id: string;
  name: string;
  hex: string;
}

interface ColorVariantOverviewProps {
  colorVariants: ColorVariantData[];
  colors: Color[];
  onEdit: (variantId: string) => void;
  onRemove: (variantId: string) => void;
  onReorder?: (orderedVariants: ColorVariantData[]) => void;
}

function SortableVariantCard({
  sortableId,
  variant,
  getColorName,
  getColorHex,
  getMainImage,
  isVariantValid,
  onEdit,
  onRemove,
}: {
  sortableId: string;
  variant: ColorVariantData;
  colors: Color[];
  getColorName: (colorId: string) => string;
  getColorHex: (colorId: string) => string;
  getMainImage: (v: ColorVariantData) => ColorVariantData["images"][0] | undefined;
  isVariantValid: (v: ColorVariantData) => boolean;
  onEdit: (variantId: string) => void;
  onRemove: (variantId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colorName = getColorName(variant.colorId);
  const colorHex = getColorHex(variant.colorId);
  const mainImage = getMainImage(variant);
  const imageCount = variant.images.length;
  const sizeCount = variant.sizes.length;
  const isValid = isVariantValid(variant);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border-2 p-4 transition-all ${
        isDragging ? "opacity-60 shadow-lg z-10" : ""
      } ${
        isValid
          ? "border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Drag handle */}
        <button
          type="button"
          className="touch-none p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        {/* Color Swatch */}
        <div
          className="w-16 h-16 rounded-lg border-2 border-border flex-shrink-0"
          style={{ backgroundColor: colorHex }}
        />

        {/* Variant Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-foreground">
              {colorName}
            </h3>
            <Badge
              variant={variant.isActive ? "paid" : "default"}
              size="sm"
              showIcon={false}
            >
              {variant.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <span>Images:</span>
              <span className="font-medium text-foreground">{imageCount}</span>
              {mainImage ? (
                <span className="text-green-600 dark:text-green-400">✓ MAIN</span>
              ) : (
                <span className="text-warning">⚠ No MAIN</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Sizes:</span>
              <span className="font-medium text-foreground">{sizeCount}</span>
            </div>
            {variant.priceDiff !== 0 && (
              <div className="flex items-center gap-2">
                <span>Price Diff:</span>
                <span className="font-medium text-foreground">
                  {variant.priceDiff > 0 ? "+" : ""}
                  ${(variant.priceDiff / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {!isValid && (
            <div className="mb-3 rounded bg-warning/10 border border-warning/20 p-2">
              <p className="text-xs text-warning">
                {!mainImage && sizeCount === 0
                  ? "Missing MAIN image and sizes"
                  : !mainImage
                    ? "Missing MAIN image"
                    : "Missing sizes"}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => variant.id && onEdit(variant.id)}
              size="sm"
              className="flex-1"
            >
              Edit
            </Button>
            <Button
              type="button"
              onClick={() => variant.id && onRemove(variant.id)}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ColorVariantOverview({
  colorVariants,
  colors,
  onEdit,
  onRemove,
  onReorder,
}: ColorVariantOverviewProps) {
  const getColorName = useCallback(
    (colorId: string) => colors.find((c) => c.id === colorId)?.name || "Unknown",
    [colors]
  );
  const getColorHex = useCallback(
    (colorId: string) => colors.find((c) => c.id === colorId)?.hex || "#000000",
    [colors]
  );
  const getMainImage = useCallback((variant: ColorVariantData) => {
    return variant.images.find((img) => img.role === "MAIN");
  }, []);
  const isVariantValid = useCallback((variant: ColorVariantData) => {
    const hasMainImage = variant.images.some((img) => img.role === "MAIN");
    const hasSizes = variant.sizes.length > 0;
    return hasMainImage && hasSizes;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortableIds = colorVariants.map(
    (v, i) => v.id ?? `temp-${v.colorId}-${i}`
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorder) return;
      const oldIndex = sortableIds.indexOf(String(active.id));
      const newIndex = sortableIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(colorVariants, oldIndex, newIndex);
      onReorder(reordered);
    },
    [colorVariants, onReorder, sortableIds]
  );

  if (colorVariants.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted p-12 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          No color variants configured yet.
        </p>
        <p className="text-xs text-muted-foreground">
          Go back to Step 2 to select colors for this product.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Configure Color Variants
        </h2>
        <p className="text-sm text-muted-foreground">
          Edit each color variant to add images and sizes. All variants must have a MAIN image and at least one size.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          To add or remove colors, go back to Step 2. Drag the handle to reorder; first variant is the default on the storefront.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colorVariants.map((variant, index) => (
              <SortableVariantCard
                key={sortableIds[index]}
                sortableId={sortableIds[index]}
                variant={variant}
                colors={colors}
                getColorName={getColorName}
                getColorHex={getColorHex}
                getMainImage={getMainImage}
                isVariantValid={isVariantValid}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Validation Summary */}
      {colorVariants.length > 0 && (
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Validation Status
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {colorVariants.filter(isVariantValid).length} of {colorVariants.length} variants are complete
              </p>
            </div>
            {colorVariants.every(isVariantValid) && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ All variants ready
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

