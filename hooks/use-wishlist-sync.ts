// hooks/use-wishlist-sync.ts
"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useWishlistStore, type GuestWishlistItem } from "@/features/wishlist";

function extractWishlistPayload(data: unknown): { items: GuestWishlistItem[]; count: number } {
  if (typeof data !== "object" || data === null) return { items: [], count: 0 };
  const record = data as Record<string, unknown>;

  if (Array.isArray(record.items)) {
    const items: GuestWishlistItem[] = [];
    for (const raw of record.items) {
      if (typeof raw === "object" && raw !== null) {
        const r = raw as Record<string, unknown>;
        if (typeof r.productId === "string") {
          items.push({
            productId: r.productId,
            colorVariantId: typeof r.colorVariantId === "string" ? r.colorVariantId : null,
            sizeVariantId: typeof r.sizeVariantId === "string" ? r.sizeVariantId : null,
          });
        }
      }
    }
    return { items, count: items.length };
  }

  if (typeof record.count === "number") {
    return { items: [], count: record.count };
  }

  return { items: [], count: 0 };
}

export function useWishlistSync() {
  const { status } = useSession();
  const pathname = usePathname();
  const {
    mode, setMode, setFromServer,
    mergeGuestWishlistIntoUser, loadGuestWishlistFromLocalStorage,
    resolveWishlistItems, initialized, initWishlist,
  } = useWishlistStore();
  const hydratedRef = useRef(false);
  const resolvedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      if (status === "authenticated") {
        setMode("user");
      } else {
        setMode("guest");
      }
      initWishlist();
    }
  }, [initialized, initWishlist, status, setMode]);

  useEffect(() => {
    if (status === "authenticated" && mode === "guest" && !initialized) {
      setMode("user");
    } else if (status === "unauthenticated" && mode === "user" && !initialized) {
      setMode("guest");
    }
  }, [status, mode, initialized, setMode]);

  useEffect(() => {
    if (!initialized) return;

    if (status === "authenticated" && mode === "guest") {
      setMode("user");
      mergeGuestWishlistIntoUser();
    } else if (status === "unauthenticated" && mode === "user") {
      setMode("guest");
      loadGuestWishlistFromLocalStorage();
    } else if (status === "authenticated" && mode === "user") {
      if (!hydratedRef.current) {
        hydratedRef.current = true;
        fetch("/api/wishlist")
          .then((res) => (res.ok ? res.json() : undefined))
          .then((data: unknown) => {
            if (data !== undefined) {
              setFromServer(extractWishlistPayload(data));
            }
            const isWishlistPage = /\/wishlist\/?$/.test(pathname);
            if (isWishlistPage && resolvedRef.current !== pathname) {
              resolvedRef.current = pathname;
              resolveWishlistItems();
            }
          })
          .catch(() => {});
      } else {
        const isWishlistPage = /\/wishlist\/?$/.test(pathname);
        if (isWishlistPage && resolvedRef.current !== pathname) {
          resolvedRef.current = pathname;
          resolveWishlistItems();
        }
      }
    } else if (status === "unauthenticated" && mode === "guest") {
      loadGuestWishlistFromLocalStorage();
      const isWishlistPage = /\/wishlist\/?$/.test(pathname);
      if (isWishlistPage && resolvedRef.current !== pathname) {
        resolvedRef.current = pathname;
        resolveWishlistItems();
      }
    }
  }, [status, mode, setMode, setFromServer, mergeGuestWishlistIntoUser, loadGuestWishlistFromLocalStorage, resolveWishlistItems, initialized, pathname]);
}
