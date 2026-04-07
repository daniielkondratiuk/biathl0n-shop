// src/features/admin/products/ui/bulk-actions-bar.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/shared/ui/admin/toast-provider";
import { BulkConfirmationModal, type BulkAction } from "./bulk-confirmation-modal";

// Badge options matching ProductBadge enum
const BADGE_OPTIONS = [
  { value: null, label: "Clear" },
  { value: "NEW", label: "New" },
  { value: "BESTSELLER", label: "Bestseller" },
  { value: "SALE", label: "Sale" },
  { value: "LIMITED", label: "Limited" },
  { value: "BACKINSTOCK", label: "Back in Stock" },
  { value: "TRENDING", label: "Trending" },
] as const;

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
}: BulkActionsBarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    action: BulkAction;
    count: number;
    extra?: string;
    payload?: Record<string, unknown>;
  } | null>(null);

  // Dropdown states
  const [badgeDropdownOpen, setBadgeDropdownOpen] = useState(false);
  const [heroDropdownOpen, setHeroDropdownOpen] = useState(false);

  async function handleBulkStatusUpdate(isActive: boolean) {
    if (selectedIds.length === 0) return;

    const idsToUpdate = [...selectedIds];
    setLoading(true);
    setAction(isActive ? "activate" : "deactivate");

    try {
      const res = await fetch("/api/products/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToUpdate, isActive }),
      });

      if (!res.ok) {
        throw new Error("Failed to update products");
      }

      const data = await res.json();
      onClearSelection();
      showToast(
        `${isActive ? "Activated" : "Deactivated"} ${data.updatedCount} product${data.updatedCount !== 1 ? "s" : ""}`,
        "success"
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast(
        `Failed to ${isActive ? "activate" : "deactivate"} products. Please try again.`,
        "error"
      );
      onClearSelection();
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;

    const idsToDelete = [...selectedIds];
    setLoading(true);
    setAction("delete");

    try {
      const res = await fetch("/api/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete products");
      }

      const data = await res.json();
      onClearSelection();
      showToast(
        `Deleted ${data.deletedCount} product${data.deletedCount !== 1 ? "s" : ""}`,
        "success"
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete products";
      showToast(errorMessage, "error");
      onClearSelection();
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  async function handleBulkUpdate(payload: Record<string, unknown>, actionName: string, successMessage: string) {
    if (selectedIds.length === 0) return;

    const idsToUpdate = [...selectedIds];
    setLoading(true);
    setAction(actionName);

    try {
      const res = await fetch("/api/products/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToUpdate, ...payload }),
      });

      if (!res.ok) {
        throw new Error("Failed to update products");
      }

      const data = await res.json();
      onClearSelection();
      showToast(
        `${successMessage} ${data.updatedCount} product${data.updatedCount !== 1 ? "s" : ""}`,
        "success"
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast(`Failed to update products. Please try again.`, "error");
      onClearSelection();
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  function handleActivateClick() {
    setConfirmModal({ action: "activate", count: selectedIds.length });
  }

  function handleDeactivateClick() {
    setConfirmModal({ action: "deactivate", count: selectedIds.length });
  }

  function handleDeleteClick() {
    setConfirmModal({ action: "delete", count: selectedIds.length });
  }

  function handleBadgeSelect(badgeValue: string | null, badgeLabel: string) {
    setBadgeDropdownOpen(false);
    if (badgeValue === null) {
      setConfirmModal({
        action: "clear-badge",
        count: selectedIds.length,
        payload: { badge: null },
      });
    } else {
      setConfirmModal({
        action: "set-badge",
        count: selectedIds.length,
        extra: badgeLabel,
        payload: { badge: badgeValue },
      });
    }
  }

  function handleHeroSelect(enable: boolean) {
    setHeroDropdownOpen(false);
    setConfirmModal({
      action: enable ? "enable-hero" : "disable-hero",
      count: selectedIds.length,
      payload: { showInHero: enable },
    });
  }

  function handleConfirm() {
    if (!confirmModal) return;

    if (confirmModal.action === "activate") {
      handleBulkStatusUpdate(true);
    } else if (confirmModal.action === "deactivate") {
      handleBulkStatusUpdate(false);
    } else if (confirmModal.action === "delete") {
      handleBulkDelete();
    } else if (confirmModal.action === "set-badge" || confirmModal.action === "clear-badge") {
      const msg = confirmModal.action === "clear-badge" ? "Cleared badge from" : "Updated badge for";
      handleBulkUpdate(confirmModal.payload!, confirmModal.action, msg);
    } else if (confirmModal.action === "enable-hero" || confirmModal.action === "disable-hero") {
      const msg = confirmModal.action === "enable-hero" ? "Enabled hero banner for" : "Disabled hero banner for";
      handleBulkUpdate(confirmModal.payload!, confirmModal.action, msg);
    }

    setConfirmModal(null);
  }

  function handleCancel() {
    setConfirmModal(null);
  }

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="sticky top-0 z-10 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleActivateClick}
              disabled={loading}
              className="text-xs"
            >
              {loading && action === "activate" ? "Activating..." : "Activate"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeactivateClick}
              disabled={loading}
              className="text-xs"
            >
              {loading && action === "deactivate"
                ? "Deactivating..."
                : "Deactivate"}
            </Button>

            {/* Badge dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBadgeDropdownOpen(!badgeDropdownOpen);
                  setHeroDropdownOpen(false);
                }}
                disabled={loading}
                className="text-xs"
              >
                {loading && (action === "set-badge" || action === "clear-badge")
                  ? "Updating..."
                  : "Set Badge"}
              </Button>
              {badgeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 rounded-md border border-border bg-card shadow-lg z-20">
                  {BADGE_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handleBadgeSelect(option.value, option.label)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hero banner dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHeroDropdownOpen(!heroDropdownOpen);
                  setBadgeDropdownOpen(false);
                }}
                disabled={loading}
                className="text-xs"
              >
                {loading && (action === "enable-hero" || action === "disable-hero")
                  ? "Updating..."
                  : "Hero Banner"}
              </Button>
              {heroDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 rounded-md border border-border bg-card shadow-lg z-20">
                  <button
                    onClick={() => handleHeroSelect(true)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors rounded-t-md"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => handleHeroSelect(false)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors rounded-b-md"
                  >
                    Disable
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={loading && action === "delete"}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              {loading && action === "delete" ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {(badgeDropdownOpen || heroDropdownOpen) && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => {
            setBadgeDropdownOpen(false);
            setHeroDropdownOpen(false);
          }}
        />
      )}

      {confirmModal && (
        <BulkConfirmationModal
          isOpen={!!confirmModal}
          action={confirmModal.action}
          count={confirmModal.count}
          extra={confirmModal.extra}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
