// src/features/cart/model/cart.store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  fetchCart,
  addItem as apiAddItem,
  updateItem as apiUpdateItem,
  removeItem as apiRemoveItem,
  clearCart as apiClearCart,
  mergeCart as apiMergeCart,
  resolveCart as apiResolveCart,
  type CartItem,
  type CartResponseItem,
  type GuestCartItem,
  type ResolvedCartItem,
} from "../api/cart.client";

// Re-export types for external use
export type { CartItem, ResolvedCartItem, GuestCartItem };

type CartMode = "guest" | "user";

interface CartStore {
  items: CartItem[];
  resolvedItems: ResolvedCartItem[];
  mode: CartMode;
  loadingInitial: boolean;
  mutatingKeys: Set<string>;
  mergedThisLogin: boolean;
  lastAuthSeen: boolean | null;
  // Backward-compatible alias for existing consumers.
  loading: boolean;
  hasLoadedOnce: boolean;
  initialized: boolean;

  // Actions
  initCart: () => Promise<void>;
  setMode: (mode: CartMode) => void;
  handleAuthTransition: (isAuthenticated: boolean) => Promise<void>;
  loadGuestCartFromLocalStorage: () => void;
  saveGuestCartToLocalStorage: () => void;
  loadUserCartFromAPI: (options?: { showInitialLoading?: boolean }) => Promise<void>;
  resolveGuestCartItems: (options?: { showInitialLoading?: boolean }) => Promise<void>;
  addItem: (params: {
    productId: string;
    colorVariantId: string;
    sizeVariantId: string;
    quantity?: number;
    selectedPatchIds?: string[];
  }) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  mergeGuestCartIntoUser: () => Promise<void>;
  setItems: (items: CartItem[]) => void;
  setResolvedItems: (items: ResolvedCartItem[]) => void;
  setLoading: (loading: boolean) => void;
}

// Helper function to generate item key
export function getItemKey(params: {
  productId: string;
  colorVariantId: string;
  sizeVariantId: string;
}): string {
  return `${params.productId}:${params.colorVariantId}:${params.sizeVariantId}`;
}

export function getLineKey(item: {
  productId: string;
  colorVariantId?: string;
  sizeVariantId?: string;
  selectedPatchIds?: string[];
}): string {
  const base = `${item.productId}:${item.colorVariantId ?? ""}:${item.sizeVariantId ?? ""}`;
  if (!item.selectedPatchIds || item.selectedPatchIds.length === 0) return base;
  return `${base}:${[...item.selectedPatchIds].sort().join(",")}`;
}

// Helper to convert guest cart item to normalized cart item
function guestItemToCartItem(item: GuestCartItem): CartItem {
  return {
    id: getItemKey(item),
    productId: item.productId,
    colorVariantId: item.colorVariantId,
    sizeVariantId: item.sizeVariantId,
    quantity: item.quantity,
  };
}

// Helper to convert normalized cart item to guest cart item
function cartItemToGuestItem(item: CartItem): GuestCartItem {
  return {
    productId: item.productId,
    colorVariantId: item.colorVariantId,
    sizeVariantId: item.sizeVariantId,
    quantity: item.quantity,
  };
}

const STORAGE_KEY = "cart_local";
let inflightUserCartLoad: Promise<void> | null = null;
let inflightGuestResolve: Promise<void> | null = null;
let inflightMerge: Promise<void> | null = null;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      resolvedItems: [],
      mode: "guest",
      loadingInitial: false,
      mutatingKeys: new Set<string>(),
      mergedThisLogin: false,
      lastAuthSeen: null,
      loading: false,
      hasLoadedOnce: false,
      initialized: false,

      initCart: async () => {
        if (get().initialized) return;
        set({ initialized: true });

        // Check if user is authenticated by trying to fetch their cart
        // This will return 401 if not authenticated, which is expected
        try {
          const response = await fetch("/api/cart");
          if (response.ok) {
            await response.json();
            // User is authenticated
            set({ mode: "user", lastAuthSeen: true });
            try {
              await get().mergeGuestCartIntoUser();
            } catch (error) {
              console.warn("Initial cart merge failed; loading canonical cart.", error);
              await get().loadUserCartFromAPI();
            }
            return;
          } else if (response.status === 401) {
            // Not authenticated - use guest mode
            set({ mode: "guest", lastAuthSeen: false, mergedThisLogin: false });
            get().loadGuestCartFromLocalStorage();
            return;
          }
        } catch (error) {
          // Network error or other issue - default to guest mode
          console.error("Error initializing cart:", error);
        }

        // Default to guest mode if we can't determine auth status
        set({ mode: "guest", lastAuthSeen: false, mergedThisLogin: false });
        get().loadGuestCartFromLocalStorage();
      },

      setMode: (mode: CartMode) => {
        set({ mode });
      },

      handleAuthTransition: async (isAuthenticated: boolean) => {
        const previousAuth = get().lastAuthSeen;
        if (previousAuth === isAuthenticated) return;

        set({ lastAuthSeen: isAuthenticated });

        if (!isAuthenticated) {
          set({ mode: "guest", mergedThisLogin: false });
          get().loadGuestCartFromLocalStorage();
          return;
        }

        set({ mode: "user" });
        if (get().mergedThisLogin) {
          await get().loadUserCartFromAPI({ showInitialLoading: false });
          return;
        }
        try {
          await get().mergeGuestCartIntoUser();
        } catch (error) {
          console.warn("Cart merge on login failed; loading canonical cart.", error);
          await get().loadUserCartFromAPI({ showInitialLoading: false });
        }
      },

      loadGuestCartFromLocalStorage: () => {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const guestItems: GuestCartItem[] = JSON.parse(stored);
            const normalizedItems = guestItems.map(guestItemToCartItem);
            set({ items: normalizedItems });
            // Resolve items after loading
            get().resolveGuestCartItems({ showInitialLoading: false });
          } else {
            set({ items: [], resolvedItems: [], hasLoadedOnce: true, loadingInitial: false, loading: false });
          }
        } catch (error) {
          console.error("Error loading guest cart from localStorage:", error);
          set({ items: [], resolvedItems: [], hasLoadedOnce: true, loadingInitial: false, loading: false });
        }
      },

      saveGuestCartToLocalStorage: () => {
        const { items } = get();
        const guestItems: GuestCartItem[] = items.map(cartItemToGuestItem);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(guestItems));
        } catch (error) {
          console.error("Error saving guest cart to localStorage:", error);
        }
      },

      loadUserCartFromAPI: async (options) => {
        if (inflightUserCartLoad) return inflightUserCartLoad;

        const showInitialLoading = options?.showInitialLoading ?? true;
        inflightUserCartLoad = (async () => {
          if (showInitialLoading) {
            set({ loadingInitial: true, loading: true });
          }
          try {
            const data = await fetchCart();
            const cart = data.cart;

            if (cart?.items) {
              const normalizedItems: CartItem[] = cart.items.map((item: CartResponseItem) => {
                const colorVariantId =
                  item.sizeVariant?.colorVariantId ||
                  item.sizeVariant?.colorVariant?.id ||
                  "";

                return {
                  id: item.id,
                  productId: item.productId,
                  colorVariantId,
                  sizeVariantId: item.sizeVariantId || "",
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  finalPrice: item.finalPrice,
                  selectedPatchIds: item.selectedPatchIds || [],
                };
              });
              set({
                items: normalizedItems,
                resolvedItems: data.resolvedItems || [],
              });
            } else {
              set({ items: [], resolvedItems: [] });
            }
          } catch (error) {
            console.error("Error loading user cart from API:", error);
            set({ items: [], resolvedItems: [] });
          } finally {
            set({ loadingInitial: false, loading: false, hasLoadedOnce: true });
          }
        })().finally(() => {
          inflightUserCartLoad = null;
        });

        return inflightUserCartLoad;
      },

      resolveGuestCartItems: async (options) => {
        if (inflightGuestResolve) return inflightGuestResolve;

        const { items } = get();
        if (items.length === 0) {
          set({ resolvedItems: [] });
          return;
        }

        const showInitialLoading = options?.showInitialLoading ?? true;
        inflightGuestResolve = (async () => {
          if (showInitialLoading) {
            set({ loadingInitial: true, loading: true });
          }
          try {
            const data = await apiResolveCart(items);
            set({ resolvedItems: data.resolvedItems || [] });
          } catch (error) {
            console.error("Error resolving guest cart items:", error);
            set({ resolvedItems: [] });
          } finally {
            set({ loadingInitial: false, loading: false, hasLoadedOnce: true });
          }
        })().finally(() => {
          inflightGuestResolve = null;
        });

        return inflightGuestResolve;
      },

      addItem: async (params) => {
        const { productId, colorVariantId, sizeVariantId, quantity = 1, selectedPatchIds = [] } = params;
        const { mode, items } = get();

        if (mode === "guest") {
          // Guest mode: update local state and localStorage
          const itemKey = getItemKey({ productId, colorVariantId, sizeVariantId });
          const existingItem = items.find((item) => item.id === itemKey);

          let updatedItems: CartItem[];
          if (existingItem) {
            updatedItems = items.map((item) =>
              item.id === itemKey
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
          } else {
            updatedItems = [
              ...items,
              {
                id: itemKey,
                productId,
                colorVariantId,
                sizeVariantId,
                quantity,
                selectedPatchIds,
              },
            ];
          }

          set({ items: updatedItems });
          get().saveGuestCartToLocalStorage();
          // Resolve items after update
          await get().resolveGuestCartItems({ showInitialLoading: false });
        } else {
          // User mode: call API
          try {
            await apiAddItem({
              productId,
              colorVariantId,
              sizeVariantId,
              quantity,
              selectedPatchIds,
            });

            // Reload cart from API to get updated state
            await get().loadUserCartFromAPI({ showInitialLoading: false });
          } catch (error) {
            console.error("Error adding item to cart:", error);
            throw error;
          }
        }
      },

      updateQuantity: async (itemId: string, newQuantity: number) => {
        const { mode, items, resolvedItems } = get();

        if (newQuantity <= 0) {
          await get().removeItem(itemId);
          return;
        }

        const targetItem = items.find((item) => item.id === itemId);
        if (!targetItem) return;

        const lineKey = getLineKey(targetItem);
        const previousItems = items;
        const previousResolvedItems = resolvedItems;
        const optimisticItems = items.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        );
        const optimisticResolvedItems = resolvedItems.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: item.unitPrice * newQuantity,
          };
        });
        set((state) => ({
          items: optimisticItems,
          resolvedItems: optimisticResolvedItems,
          mutatingKeys: new Set(state.mutatingKeys).add(lineKey),
        }));

        if (mode === "guest") {
          try {
            get().saveGuestCartToLocalStorage();
            await get().resolveGuestCartItems({ showInitialLoading: false });
          } catch (error) {
            console.warn("Failed cart quantity update, rolling back.", error);
            set({ items: previousItems, resolvedItems: previousResolvedItems });
          } finally {
            set((state) => {
              const next = new Set(state.mutatingKeys);
              next.delete(lineKey);
              return { mutatingKeys: next };
            });
          }
        } else {
          try {
            await apiUpdateItem(itemId, newQuantity);

            // Reload cart which will include resolved items
            await get().loadUserCartFromAPI({ showInitialLoading: false });
          } catch (error) {
            console.warn("Failed cart quantity update, rolling back.", error);
            set({ items: previousItems, resolvedItems: previousResolvedItems });
          } finally {
            set((state) => {
              const next = new Set(state.mutatingKeys);
              next.delete(lineKey);
              return { mutatingKeys: next };
            });
          }
        }
      },

      removeItem: async (itemId: string) => {
        const { mode, items, resolvedItems } = get();
        const targetItem = items.find((item) => item.id === itemId);
        if (!targetItem) return;

        const lineKey = getLineKey(targetItem);
        const previousItems = items;
        const previousResolvedItems = resolvedItems;
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          resolvedItems: state.resolvedItems.filter((item) => item.id !== itemId),
          mutatingKeys: new Set(state.mutatingKeys).add(lineKey),
        }));

        if (mode === "guest") {
          try {
            get().saveGuestCartToLocalStorage();
            await get().resolveGuestCartItems({ showInitialLoading: false });
          } catch (error) {
            console.warn("Failed cart remove, rolling back.", error);
            set({ items: previousItems, resolvedItems: previousResolvedItems });
          } finally {
            set((state) => {
              const next = new Set(state.mutatingKeys);
              next.delete(lineKey);
              return { mutatingKeys: next };
            });
          }
        } else {
          try {
            await apiRemoveItem(itemId);

            await get().loadUserCartFromAPI({ showInitialLoading: false });
          } catch (error) {
            console.warn("Failed cart remove, rolling back.", error);
            set({ items: previousItems, resolvedItems: previousResolvedItems });
          } finally {
            set((state) => {
              const next = new Set(state.mutatingKeys);
              next.delete(lineKey);
              return { mutatingKeys: next };
            });
          }
        }
      },

      clearCart: async () => {
        const { mode } = get();

        if (mode === "guest") {
          set({ items: [], resolvedItems: [] });
          get().saveGuestCartToLocalStorage();
        } else {
          set({ loadingInitial: true, loading: true });
          try {
            await apiClearCart();

            set({ items: [] });
          } catch (error) {
            console.error("Error clearing cart:", error);
            throw error;
          } finally {
            set({ loadingInitial: false, loading: false });
          }
        }
      },

      mergeGuestCartIntoUser: async () => {
        if (inflightMerge) return inflightMerge;

        inflightMerge = (async () => {
          let guestCartItems: GuestCartItem[] = [];
          try {
            const rawGuest = localStorage.getItem(STORAGE_KEY);
            if (rawGuest) {
              const parsed = JSON.parse(rawGuest) as GuestCartItem[];
              if (Array.isArray(parsed)) {
                guestCartItems = parsed;
              }
            }
          } catch (error) {
            console.warn("Failed to parse guest cart before merge.", error);
          }

          if (guestCartItems.length === 0) {
            set({ mergedThisLogin: true });
            await get().loadUserCartFromAPI({ showInitialLoading: false });
            return;
          }

          try {
            await apiMergeCart(guestCartItems);
            localStorage.removeItem(STORAGE_KEY);
            set({ mergedThisLogin: true });
            await get().loadUserCartFromAPI({ showInitialLoading: false });
          } catch (error) {
            console.warn("Error merging guest cart into user:", error);
            throw error;
          }
        })().finally(() => {
          inflightMerge = null;
        });

        return inflightMerge;
      },

      setItems: (items: CartItem[]) => {
        set({ items });
      },

      setResolvedItems: (items: ResolvedCartItem[]) => {
        set({ resolvedItems: items });
      },

      setLoading: (loading: boolean) => {
        set({ loading, loadingInitial: loading });
      },
    }),
    {
      name: "cart-store",
      partialize: (state) => ({
        // Only persist mode, not items (items are in localStorage for guest mode)
        mode: state.mode,
      }),
    }
  )
);

