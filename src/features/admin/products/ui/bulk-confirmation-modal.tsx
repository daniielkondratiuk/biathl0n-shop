// src/features/admin/products/ui/bulk-confirmation-modal.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type BulkAction =
  | "activate"
  | "deactivate"
  | "delete"
  | "set-badge"
  | "clear-badge"
  | "enable-hero"
  | "disable-hero";

interface BulkConfirmationModalProps {
  isOpen: boolean;
  action: BulkAction;
  count: number;
  extra?: string; // For badge name, etc.
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkConfirmationModal({
  isOpen,
  action,
  count,
  extra,
  onConfirm,
  onCancel,
}: BulkConfirmationModalProps) {
  if (!isOpen) return null;

  const actionLabels: Record<BulkAction, string> = {
    activate: "Activate",
    deactivate: "Deactivate",
    delete: "Delete",
    "set-badge": `Set badge to "${extra}"`,
    "clear-badge": "Clear badge",
    "enable-hero": "Enable hero banner",
    "disable-hero": "Disable hero banner",
  };

  const actionLabel = actionLabels[action];
  const isDelete = action === "delete";

  const getActionDescription = () => {
    switch (action) {
      case "set-badge":
        return `set the badge to "${extra}" for`;
      case "clear-badge":
        return "clear the badge from";
      case "enable-hero":
        return "enable hero banner display for";
      case "disable-hero":
        return "disable hero banner display for";
      default:
        return `${actionLabel.toLowerCase()}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Confirm bulk action
        </h2>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to {getActionDescription()}{" "}
            <strong>{count}</strong> product{count !== 1 ? "s" : ""}?
          </p>
          {isDelete && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Warning: This will permanently delete the product data and all
              associated image files. This action cannot be undone.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={isDelete ? "primary" : "primary"}
            onClick={onConfirm}
            className={isDelete ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            Confirm
          </Button>
        </div>
      </Card>
    </div>
  );
}
