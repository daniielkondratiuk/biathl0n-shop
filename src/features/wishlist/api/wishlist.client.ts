// src/features/wishlist/api/wishlist.client.ts

import type { Product, Category, ProductImage } from "@/shared/types/prisma";
const WISHLIST_STORAGE_KEY = "wishlist_guest";
const LEGACY_WISHLIST_STORAGE_KEY = "wishlist";

export interface GuestWishlistItem {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
}

export type ProductWithRelations = Product & {
  category: Category;
  colorVariants?: Array<{
    id: string;
    color?: {
      id: string;
      name: string;
      hex: string;
    };
    images?: Partial<ProductImage>[];
  }>;
};

export interface ResolvedWishlistItem {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  product: ProductWithRelations;
}

export interface WishlistResponse {
  mode: "user" | "guest";
  count: number;
  items: ResolvedWishlistItem[];
}

export interface MergeWishlistRequest {
  items: GuestWishlistItem[];
}

export interface RemoveWishlistItemRequest {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
}

function normalizeGuestItems(input: unknown): GuestWishlistItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: GuestWishlistItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as {
      productId?: unknown;
      id?: unknown;
      colorVariantId?: unknown;
      sizeVariantId?: unknown;
    };
    const pid =
      typeof item.productId === "string"
        ? item.productId
        : typeof item.id === "string"
          ? item.id
          : null;
    if (!pid || pid.trim().length === 0) continue;
    const normalizedItem: GuestWishlistItem = {
      productId: pid.trim(),
      colorVariantId: typeof item.colorVariantId === "string" ? item.colorVariantId : null,
      sizeVariantId: typeof item.sizeVariantId === "string" ? item.sizeVariantId : null,
    };
    const normalizedKey = `${normalizedItem.productId}:${normalizedItem.colorVariantId ?? "none"}:${normalizedItem.sizeVariantId ?? "none"}`;
    if (seen.has(normalizedKey)) continue;
    seen.add(normalizedKey);
    result.push(normalizedItem);
  }
  return result;
}

function migrateLegacyGuestWishlistKey(): void {
  try {
    const legacyRaw = localStorage.getItem(LEGACY_WISHLIST_STORAGE_KEY);
    if (!legacyRaw) return;
    const parsed = JSON.parse(legacyRaw) as unknown;
    if (!Array.isArray(parsed)) return;
    const migrated = normalizeGuestItems(parsed);
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_WISHLIST_STORAGE_KEY);
  } catch {
    // Ignore migration errors and continue with current key.
  }
}

export function readGuestWishlist(): GuestWishlistItem[] {
  try {
    migrateLegacyGuestWishlistKey();
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    return normalizeGuestItems(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function writeGuestWishlist(items: GuestWishlistItem[]): void {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalizeGuestItems(items)));
  } catch {
    // Ignore localStorage write errors.
  }
}

/**
 * Fetch the user's wishlist from the API
 */
export async function fetchWishlist(guestItemsOverride?: GuestWishlistItem[]): Promise<WishlistResponse> {
  const guestItems = normalizeGuestItems(guestItemsOverride ?? readGuestWishlist());

  try {
    const response = await fetch("/api/wishlist", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: guestItems }),
    });
    if (!response.ok) {
      return { mode: "guest", count: 0, items: [] };
    }
    const data = (await response.json()) as Partial<WishlistResponse>;
    const mode = data.mode === "user" ? "user" : "guest";
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const items: ResolvedWishlistItem[] = [];
    for (const raw of rawItems) {
      const entry = raw as {
        productId?: unknown;
        colorVariantId?: unknown;
        sizeVariantId?: unknown;
        product?: unknown;
      };
      const product = entry.product as { id?: unknown } | undefined;
      const productId =
        typeof entry.productId === "string"
          ? entry.productId.trim()
          : typeof product?.id === "string"
            ? product.id.trim()
            : null;
      if (!productId || !entry.product) continue;
      items.push({
        productId,
        colorVariantId: typeof entry.colorVariantId === "string" ? entry.colorVariantId : null,
        sizeVariantId: typeof entry.sizeVariantId === "string" ? entry.sizeVariantId : null,
        product: entry.product as ProductWithRelations,
      });
    }
    const count = items.length;
    return { mode, count, items };
  } catch {
    return { mode: "guest", count: 0, items: [] };
  }
}

/**
 * Add an item to the wishlist
 */
export async function addItem(item: GuestWishlistItem): Promise<void> {
  const response = await fetch("/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    throw new Error("Failed to add item to wishlist");
  }
}

/**
 * Remove an item from the wishlist
 */
export async function removeItem(params: RemoveWishlistItemRequest): Promise<void> {
  const response = await fetch("/api/wishlist", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: params.productId,
      colorVariantId: params.colorVariantId,
      sizeVariantId: params.sizeVariantId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to remove item from wishlist");
  }
}

/**
 * Merge guest wishlist items into user wishlist
 */
export async function mergeWishlist(items: GuestWishlistItem[]): Promise<void> {
  const response = await fetch("/api/wishlist/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    throw new Error("Failed to merge wishlist");
  }
}

