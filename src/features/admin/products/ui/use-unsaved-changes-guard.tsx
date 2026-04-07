// src/features/admin/products/ui/use-unsaved-changes-guard.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UseUnsavedChangesGuardOptions {
  dirty: boolean;
  enabled?: boolean;
  onConfirmLeave?: () => void;
}

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
}

function UnsavedChangesModal({ isOpen, onStay, onLeave }: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Unsaved changes</h2>
        <p className="text-sm text-muted-foreground">
          You have unsaved changes. Leave this page?
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onStay}>
            Stay
          </Button>
          <Button variant="primary" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * Hook to guard against accidental navigation when there are unsaved changes.
 * Handles browser-level navigation (refresh/close) and in-app navigation (back/forward, router.push).
 * 
 * Uses a "history trap" approach: pushes a sentinel state when enabled, then re-pushes it
 * on every popstate event when dirty, effectively trapping the user on the page until they confirm.
 */
export function useUnsavedChangesGuard({
  dirty,
  enabled = true,
  onConfirmLeave,
}: UseUnsavedChangesGuardOptions) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  
  // Use refs to avoid stale closures in popstate handler
  const dirtyRef = useRef(dirty);
  const enabledRef = useRef(enabled);
  const isHandlingRef = useRef(false); // Lock to prevent multiple rapid popstate events
  const allowNextPopRef = useRef(false); // Allow next popstate to proceed (user confirmed "Leave")
  const sentinelPushedRef = useRef(false); // Track if sentinel state has been pushed
  const sentinelKeyRef = useRef(0); // Unique key for sentinel state (initialized in effect)

  // Initialize sentinel key once on mount (avoids calling Date.now during render)
  useEffect(() => {
    sentinelKeyRef.current = Date.now();
  }, []);

  // Keep refs in sync with props
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Block browser-level navigation (refresh, close tab, etc.)
  useEffect(() => {
    if (!enabled || !dirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, dirty]);

  // History trap: intercept browser back/forward navigation (including trackpad swipe)
  useEffect(() => {
    // Push sentinel state ONCE when guard becomes active
    if (enabled && dirty && !sentinelPushedRef.current) {
      const sentinelState = { __unsavedGuard: true, key: sentinelKeyRef.current };
      window.history.pushState(sentinelState, "", window.location.href);
      sentinelPushedRef.current = true;
    }

    // Remove sentinel if guard becomes inactive
    if ((!enabled || !dirty) && sentinelPushedRef.current) {
      // Only remove if we're still on the same page (state matches)
      if (window.history.state?.__unsavedGuard && window.history.state?.key === sentinelKeyRef.current) {
        window.history.back();
      }
      sentinelPushedRef.current = false;
      allowNextPopRef.current = false;
    }

    const handlePopState = () => {
      // If user confirmed "Leave", allow this popstate to proceed
      if (allowNextPopRef.current) {
        allowNextPopRef.current = false;
        sentinelPushedRef.current = false;
        return;
      }

      // If guard is not active, do nothing
      if (!enabledRef.current || !dirtyRef.current) {
        return;
      }

      // Prevent multiple rapid popstate events from causing multiple pushes/modals
      if (isHandlingRef.current) {
        return;
      }
      isHandlingRef.current = true;

      // Immediately re-push sentinel state to trap user on current page
      const sentinelState = { __unsavedGuard: true, key: sentinelKeyRef.current };
      window.history.pushState(sentinelState, "", window.location.href);

      // Reset lock after microtask to allow handling next event
      Promise.resolve().then(() => {
        isHandlingRef.current = false;
      });

      // Show confirmation modal
      setPendingNavigation(() => {
        return () => {
          // User confirmed "Leave" - allow next popstate to proceed
          allowNextPopRef.current = true;
          // Navigate back exactly once
          window.history.back();
        };
      });
      setShowModal(true);
    };

    // Add listener once (not re-added on every render)
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Clean up sentinel state on unmount if still present
      if (sentinelPushedRef.current && window.history.state?.__unsavedGuard) {
        if (window.history.state.key === sentinelKeyRef.current) {
          window.history.back();
        }
      }
    };
  }, [enabled, dirty]); // Re-run when enabled/dirty changes to manage sentinel state

  // Wrapper for router.push that checks for unsaved changes
  // This handles programmatic navigation (Cancel button, etc.) - separate from browser back/forward
  const guardedPush = useCallback(
    (href: string) => {
      if (!enabled || !dirty) {
        router.push(href);
        return;
      }

      // Show confirmation modal
      setPendingNavigation(() => {
        return () => {
          if (onConfirmLeave) {
            onConfirmLeave();
          }
          router.push(href);
        };
      });
      setShowModal(true);
    },
    [enabled, dirty, router, onConfirmLeave]
  );

  const handleStay = useCallback(() => {
    setShowModal(false);
    setPendingNavigation(null);
    // User stays - sentinel state remains, trap continues to work
  }, []);

  const handleLeave = useCallback(() => {
    setShowModal(false);
    const nav = pendingNavigation;
    setPendingNavigation(null);
    if (nav) {
      nav(); // This will either call history.back() (for browser nav) or router.push (for programmatic nav)
    }
  }, [pendingNavigation]);

  return {
    guardedPush,
    Modal: () => <UnsavedChangesModal isOpen={showModal} onStay={handleStay} onLeave={handleLeave} />,
  };
}
