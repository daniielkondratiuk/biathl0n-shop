// src/features/wishlist/model/wishlist.store.ts
"use client";

import { create } from "zustand";
import {
  fetchWishlist,
  addItem as apiAddItem,
  removeItem as apiRemoveItem,
  mergeWishlist as apiMergeWishlist,
  readGuestWishlist,
  writeGuestWishlist,
  type GuestWishlistItem,
  type ResolvedWishlistItem,
} from "../api/wishlist.client";

// Re-export types for external use
export type { GuestWishlistItem, ResolvedWishlistItem };

type WishlistMode = "guest" | "user";

interface ServerWishlistPayload {
  items?: GuestWishlistItem[];
  count?: number;
}

interface WishlistStore {
  items: GuestWishlistItem[];
  itemsResolved: ResolvedWishlistItem[];
  resolvedItems: ResolvedWishlistItem[];
  count: number;
  serverCount: number;
  mode: WishlistMode;
  loading: boolean;
  loadingInitial: boolean;
  ready: boolean;
  mutating: boolean;
  uiReady: boolean;
  inflightBootstrap: Promise<void> | null;
  inflightRefresh: Promise<void> | null;
  refreshSeq: number;
  hasLoadedOnce: boolean;
  initialized: boolean;
  mergedThisLogin: boolean;
  lastGuestSignature: string;
  lastAuthSeen: boolean;
  justLoggedIn: boolean;
  
  // Actions
  bootstrap: () => Promise<void>;
  refresh: (overrideGuestItems?: GuestWishlistItem[]) => Promise<void>;
  initWishlist: () => void;
  setMode: (mode: WishlistMode) => void;
  setFromServer: (payload: ServerWishlistPayload) => void;
  loadGuestWishlistFromLocalStorage: () => void;
  saveGuestWishlistToLocalStorage: () => void;
  loadUserWishlistFromAPI: () => Promise<void>;
  addItem: (item: GuestWishlistItem) => Promise<void>;
  removeItem: (productId: string, colorVariantId?: string | null, sizeVariantId?: string | null) => Promise<void>;
  isInWishlist: (productId: string, colorVariantId?: string | null, sizeVariantId?: string | null) => boolean;
  mergeGuestWishlistIntoUser: () => Promise<void>;
  resolveWishlistItems: () => Promise<void>;
}

function getItemKey(item: GuestWishlistItem): string {
  return `${item.productId}:${item.colorVariantId || "none"}:${item.sizeVariantId || "none"}`;
}

function sanitizeGuestItem(raw: unknown): GuestWishlistItem | null {
  const obj = raw as {
    productId?: unknown;
    id?: unknown;
    colorVariantId?: unknown;
    sizeVariantId?: unknown;
  } | null;
  const productId =
    typeof obj?.productId === "string"
      ? obj.productId
      : typeof obj?.id === "string"
        ? obj.id
        : null;
  if (!productId || productId.trim().length === 0) return null;
  return {
    productId: productId.trim(),
    colorVariantId: typeof obj?.colorVariantId === "string" ? obj.colorVariantId : null,
    sizeVariantId: typeof obj?.sizeVariantId === "string" ? obj.sizeVariantId : null,
  };
}

function getGuestSignature(items: GuestWishlistItem[]): string {
  return items
    .map((item) => getItemKey(item))
    .sort()
    .join("|");
}

function mapResolvedToGuestItems(itemsResolved: ResolvedWishlistItem[]): GuestWishlistItem[] {
  return normalizeWishlistItems(
    itemsResolved.map((item) => ({
      productId: item.productId,
      colorVariantId: item.colorVariantId ?? null,
      sizeVariantId: item.sizeVariantId ?? null,
    })),
  );
}

function isProductOnly(item: GuestWishlistItem): boolean {
  return item.colorVariantId == null && item.sizeVariantId == null;
}

/**
 * Canonical deduplication of wishlist items.
 * - Product-only items (both variant IDs null): at most one per productId.
 * - Composite items (at least one variant ID): at most one per exact composite key.
 * - Both product-only and composite entries for the same productId may coexist.
 * Pure function — no in-place mutation.
 */
function normalizeWishlistItems(items: GuestWishlistItem[]): GuestWishlistItem[] {
  const seenProductOnly = new Set<string>();
  const seenComposite = new Set<string>();
  const result: GuestWishlistItem[] = [];

  for (const item of items) {
    if (isProductOnly(item)) {
      if (seenProductOnly.has(item.productId)) continue;
      seenProductOnly.add(item.productId);
    } else {
      const key = getItemKey(item);
      if (seenComposite.has(key)) continue;
      seenComposite.add(key);
    }
    result.push(item);
  }

  return result;
}

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
  items: [],
  itemsResolved: [],
  resolvedItems: [],
  count: 0,
  serverCount: 0,
  mode: "guest",
  loading: false,
  loadingInitial: false,
  ready: false,
  mutating: false,
  uiReady: false,
  inflightBootstrap: null,
  inflightRefresh: null,
  refreshSeq: 0,
  hasLoadedOnce: false,
  initialized: false,
  mergedThisLogin: false,
  lastGuestSignature: "",
  lastAuthSeen: false,
  justLoggedIn: false,

  bootstrap: async () => {
    const existing = get().inflightBootstrap;
    if (existing) {
      await existing;
      return;
    }

    const currentGuestItems = normalizeWishlistItems(readGuestWishlist());
    const currentGuestSignature = getGuestSignature(currentGuestItems);
    const snapshot = get();
    const authTransitionDetected = snapshot.lastAuthSeen !== (snapshot.mode === "user") || snapshot.justLoggedIn;
    const hasUnresolvedVisibleState = snapshot.count > 0 && snapshot.itemsResolved.length === 0;
    const guestSourceChanged =
      snapshot.mode === "guest" && currentGuestSignature !== snapshot.lastGuestSignature;
    const userNeedsMerge =
      snapshot.mode === "user" && currentGuestItems.length > 0 && !snapshot.mergedThisLogin;
    const shouldRefresh =
      !snapshot.ready ||
      hasUnresolvedVisibleState ||
      authTransitionDetected ||
      guestSourceChanged ||
      userNeedsMerge;

    const run = (async () => {
      const shouldSetLoadingInitial = !snapshot.hasLoadedOnce;
      if (shouldSetLoadingInitial) {
        set({ loadingInitial: true });
      }
      try {
        if (shouldRefresh) {
          await get().refresh(currentGuestItems);
        }
      } catch {
        // Keep minimal: bootstrap must still settle flags.
      } finally {
        set({
          loadingInitial: false,
          ready: true,
          hasLoadedOnce: true,
          initialized: true,
          uiReady: true,
          lastGuestSignature: get().mode === "guest" ? currentGuestSignature : get().lastGuestSignature,
        });
      }
    })();

    set({ inflightBootstrap: run });
    try {
      await run;
    } finally {
      set({
        inflightBootstrap: null,
        loadingInitial: false,
        ready: true,
      });
    }
  },

  refresh: async (overrideGuestItems?: GuestWishlistItem[]) => {
    const existing = get().inflightRefresh;
    if (existing) {
      await existing;
      return;
    }

    const run = (async () => {
      const seq = get().refreshSeq + 1;
      set({ loading: true, refreshSeq: seq });
      const guestItems = normalizeWishlistItems(
        (overrideGuestItems ?? readGuestWishlist())
          .map((item) => sanitizeGuestItem(item))
          .filter((item): item is GuestWishlistItem => item !== null),
      );
      try {
        if (overrideGuestItems) {
          writeGuestWishlist(guestItems);
        }
        const data = await fetchWishlist(guestItems);
        const prevMode = get().mode;
        let mode: WishlistMode = data.mode === "user" ? "user" : "guest";
        let itemsResolved = Array.isArray(data.items) ? data.items : [];
        const prevUserCount = mode === "user" ? itemsResolved.length : 0;
        const mergedThisLoginBefore = get().mergedThisLogin;

        if (mode === "user" && guestItems.length > 0 && !mergedThisLoginBefore) {
          try {
            await apiMergeWishlist(guestItems);
            writeGuestWishlist([]);
            set({ mergedThisLogin: true });
            let merged = await fetchWishlist([]);
            let mergedItems = Array.isArray(merged.items) ? merged.items : [];
            for (let attempt = 1; attempt <= 3 && mergedItems.length <= prevUserCount; attempt += 1) {
              await new Promise((r) => setTimeout(r, 120));
              merged = await fetchWishlist([]);
              mergedItems = Array.isArray(merged.items) ? merged.items : [];
            }
            mode = merged.mode === "user" ? "user" : "guest";
            itemsResolved = mergedItems;
          } catch {
            set({ mergedThisLogin: false });
          }
        }

        if (mode === "guest") {
          set({ mergedThisLogin: false });
        }

        if (get().refreshSeq !== seq) {
          return;
        }

        const items = mapResolvedToGuestItems(itemsResolved).filter(
          (item) => !!item.productId && item.productId.trim().length > 0,
        );
        const resolvedLen = itemsResolved.length;
        const lastGuestSignature = mode === "guest" ? getGuestSignature(guestItems) : "";
        set({
          mode,
          items,
          itemsResolved,
          resolvedItems: itemsResolved,
          count: resolvedLen,
          serverCount: resolvedLen,
          lastGuestSignature,
          hasLoadedOnce: true,
          initialized: true,
          uiReady: true,
          lastAuthSeen: mode === "user",
          justLoggedIn: prevMode === "guest" && mode === "user",
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[wishlist] refresh failed", error);
        }
        if (get().refreshSeq === seq) {
          const fallbackKeys = normalizeWishlistItems(
            readGuestWishlist()
              .map((item) => sanitizeGuestItem(item))
              .filter((item): item is GuestWishlistItem => item !== null),
          );
          set({
            items: fallbackKeys,
            itemsResolved: [],
            resolvedItems: [],
            count: 0,
            serverCount: 0,
            lastAuthSeen: false,
            justLoggedIn: false,
          });
        }
      } finally {
        set({ loading: false, mutating: false });
      }
    })();

    set({ inflightRefresh: run });
    try {
      await run;
    } finally {
      set({ inflightRefresh: null });
    }
  },

  initWishlist: () => {
    void get().bootstrap();
  },

  setMode: (mode: WishlistMode) => {
    set({ mode });
  },

  setFromServer: (payload: ServerWishlistPayload) => {
    const items = normalizeWishlistItems(payload.items || []);
    const nextCount = typeof payload.count === "number" ? payload.count : items.length;
    set({ items, count: nextCount, serverCount: nextCount });
  },

  loadGuestWishlistFromLocalStorage: () => {
    try {
      const items = normalizeWishlistItems(readGuestWishlist());
      const count = items.length;
      set({
        mode: "guest",
        items,
        itemsResolved: [],
        resolvedItems: [],
        count,
        serverCount: count,
        lastGuestSignature: getGuestSignature(items),
        lastAuthSeen: false,
        justLoggedIn: false,
      });
    } catch {
      set({
        items: [],
        itemsResolved: [],
        resolvedItems: [],
        count: 0,
        serverCount: 0,
        lastAuthSeen: false,
        justLoggedIn: false,
      });
    } finally {
      set({
        loading: false,
        loadingInitial: false,
        ready: true,
        hasLoadedOnce: true,
        initialized: true,
        uiReady: true,
      });
    }
  },

  saveGuestWishlistToLocalStorage: () => {
    const { items } = get();
    writeGuestWishlist(items);
  },

  loadUserWishlistFromAPI: async () => {
    await get().bootstrap();
  },

  addItem: async (item: GuestWishlistItem) => {
    const clean = sanitizeGuestItem(item);
    if (!clean) return;
    const { mode, items } = get();
    
    // When no variant IDs specified, block add if ANY item with this productId exists
    const noVariants = isProductOnly(clean);
    const exists = noVariants
      ? items.some(i => i.productId === clean.productId)
      : items.some(i => getItemKey(i) === getItemKey(clean));
    if (exists) return;

    const prevItems = items;
    const prevItemsResolved = get().itemsResolved;
    const prevCount = get().count;
    const nextItems = normalizeWishlistItems([...items, clean]);
    set({ items: nextItems, mutating: true, loading: true });

    if (mode === "guest") {
      try {
        await get().refresh(nextItems);
      } finally {
        set({ mutating: false, loading: false });
      }
    } else {
      try {
        await apiAddItem(clean);
        await get().refresh();
      } catch {
        set({
          items: prevItems,
          itemsResolved: prevItemsResolved,
          resolvedItems: prevItemsResolved,
          count: prevCount,
          serverCount: prevCount,
        });
        writeGuestWishlist(prevItems);
      } finally {
        set({ mutating: false, loading: false });
      }
    }
  },

  removeItem: async (productId: string, colorVariantId?: string | null, sizeVariantId?: string | null) => {
    const { mode, items } = get();
    const noVariants = colorVariantId == null && sizeVariantId == null;
    const prevItems = items;
    const prevItemsResolved = get().itemsResolved;
    const prevCount = get().count;
    const nextItems = noVariants
      ? normalizeWishlistItems(items.filter(i => i.productId !== productId))
      : normalizeWishlistItems(items.filter(i => getItemKey(i) !== getItemKey({ productId, colorVariantId, sizeVariantId })));
    set({ items: nextItems, mutating: true, loading: true });

    if (mode === "guest") {
      try {
        await get().refresh(nextItems);
      } finally {
        set({ mutating: false, loading: false });
      }
    } else {
      try {
        if (noVariants) {
          const toRemove = items.filter(i => i.productId === productId);
          for (const entry of toRemove) {
            await apiRemoveItem({
              productId,
              colorVariantId: entry.colorVariantId,
              sizeVariantId: entry.sizeVariantId,
            });
          }
        } else {
          await apiRemoveItem({ productId, colorVariantId, sizeVariantId });
        }
        await get().refresh();
      } catch {
        set({
          items: prevItems,
          itemsResolved: prevItemsResolved,
          resolvedItems: prevItemsResolved,
          count: prevCount,
          serverCount: prevCount,
        });
        writeGuestWishlist(prevItems);
      } finally {
        set({ mutating: false, loading: false });
      }
    }
  },

  isInWishlist: (productId: string, colorVariantId?: string | null, sizeVariantId?: string | null) => {
    const { items } = get();
    // When no variant IDs specified, match any item with this productId
    if (colorVariantId == null && sizeVariantId == null) {
      return items.some(i => i.productId === productId);
    }
    const key = getItemKey({ productId, colorVariantId, sizeVariantId });
    return items.some(i => getItemKey(i) === key);
  },

  mergeGuestWishlistIntoUser: async () => {
    const { items } = get();
    if (items.length === 0) return;

    set({ loading: true, mutating: true });
    try {
      await apiMergeWishlist(items);
      writeGuestWishlist([]);
      set({ mergedThisLogin: true });
      await get().refresh([]);
    } catch {
      // Error handled silently
    } finally {
      set({ loading: false, mutating: false });
    }
  },

  resolveWishlistItems: async () => {
    // Resolution is handled by GET /api/wishlist bootstrap payload.
  },
}));
