// components/admin/adjust-stock-modal.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/shared/ui/admin/toast-provider";
import { cn } from "@/lib/utils";

interface AdjustStockModalProps {
  variantId: string;
  variantSku: string;
  currentStock: number;
  currentReserved: number;
  currentAvailable: number;
  onClose: () => void;
}

type AdjustmentType = "add" | "remove";

export function AdjustStockModal({
  variantId,
  variantSku,
  currentStock,
  currentReserved,
  currentAvailable,
  onClose,
}: AdjustStockModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("add");
  const [quantity, setQuantity] = useState("");

  const quantityNum = parseInt(quantity, 10);
  const isValidQuantity = !isNaN(quantityNum) && quantityNum >= 1;
  
  // Calculate new stock after adjustment
  const onHandAfter = adjustmentType === "add" 
    ? currentStock + (isValidQuantity ? quantityNum : 0)
    : currentStock - (isValidQuantity ? quantityNum : 0);
  
  const availableAfter = Math.max(0, onHandAfter - currentReserved);
  
  // Validation
  const removeExceedsStock = adjustmentType === "remove" && isValidQuantity && quantityNum > currentStock;
  const canSubmit = isValidQuantity && !removeExceedsStock;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canSubmit) {
      if (!isValidQuantity) {
        showToast("Quantity must be at least 1", "error");
      } else if (removeExceedsStock) {
        showToast("Cannot remove more than on-hand stock", "error");
      }
      return;
    }

    // Calculate absolute new stock value for API
    const newStock = adjustmentType === "add" 
      ? currentStock + quantityNum 
      : currentStock - quantityNum;

    setLoading(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          newStock,
          reason: "correction", // Default reason since API requires it
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error || "Failed to adjust stock", "error");
        setLoading(false);
        return;
      }

      showToast("Stock updated successfully", "success");
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Failed to adjust stock. Please try again.", "error");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Adjust Stock</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          SKU: <span className="font-mono">{variantSku}</span>
        </p>

        {/* Current values */}
        <div className="mb-4 space-y-2 rounded-lg border border-border bg-muted p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">On hand:</span>
            <span className="font-semibold text-foreground">{currentStock}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Reserved:</span>
            <span className="font-semibold text-foreground">{currentReserved}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available:</span>
            <span className="font-semibold text-foreground">{currentAvailable}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adjustment Type Toggle */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Adjustment Type
            </label>
            <div className="inline-flex rounded-lg border border-border bg-muted p-1">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  adjustmentType === "add"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("remove")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  adjustmentType === "remove"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Remove
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Quantity
            </label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
            />
            {removeExceedsStock && (
              <p className="mt-1 text-xs text-destructive">
                Cannot remove more than on-hand stock
              </p>
            )}
          </div>

          {/* Live Preview */}
          {isValidQuantity && !removeExceedsStock && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">After change: On hand =</span>
                <span className="font-semibold text-foreground">{onHandAfter}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available after change =</span>
                <span className="font-semibold text-foreground">{availableAfter}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading || !canSubmit} 
              className="flex-1"
            >
              {loading 
                ? "Updating..." 
                : adjustmentType === "add" 
                  ? "Add to stock" 
                  : "Remove from stock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

