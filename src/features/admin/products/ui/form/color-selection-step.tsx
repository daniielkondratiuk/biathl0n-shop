// src/features/admin/products/ui/form/color-selection-step.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Color {
  id: string;
  name: string;
  hex: string;
}

interface ColorSelectionStepProps {
  colors: Color[];
  selectedColorIds: string[];
  onSelectionChange: (colorIds: string[]) => void;
  onContinue: () => void;
}

export function ColorSelectionStep({
  colors,
  selectedColorIds,
  onSelectionChange,
  onContinue,
}: ColorSelectionStepProps) {
  const [localSelection, setLocalSelection] = useState<string[]>(selectedColorIds);

  useEffect(() => {
    setLocalSelection(selectedColorIds);
  }, [selectedColorIds]);

  const toggleColor = (colorId: string) => {
    const newSelection = localSelection.includes(colorId)
      ? localSelection.filter(id => id !== colorId)
      : [...localSelection, colorId];
    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  const canContinue = localSelection.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Select Available Colors
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose which colors are available for this product. You&apos;ll configure each color in the next step.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {colors.map((color) => {
          const isSelected = localSelection.includes(color.id);
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => toggleColor(color.id)}
              className={`relative rounded-lg border-2 p-4 transition-all ${
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full border-2 border-border shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleColor(color.id)}
                    className="rounded border-border"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {color.name}
                  </span>
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {localSelection.length === 0 && (
        <div className="rounded-lg border border-warning bg-warning/10 p-4">
          <p className="text-sm text-warning">
            Please select at least one color to continue.
          </p>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="min-w-[120px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

