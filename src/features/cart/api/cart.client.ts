// src/features/cart/api/cart.client.ts

export interface CartItem {
  id: string;
  productId: string;
  colorVariantId: string;
  sizeVariantId: string;
  quantity: number;
  unitPrice?: number;
  finalPrice?: number;
  selectedPatchIds?: string[];
}

export interface GuestCartItem {
  productId: string;
  colorVariantId: string;
  sizeVariantId: string;
  quantity: number;
}

export interface ResolvedCartItem {
  id: string;
  productId: string;
  title: string;
  slug: string;
  categoryName?: string;
  colorName: string;
  colorHex: string;
  colorVariantId: string;
  sizeLabel: string;
  sizeVariantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string | null;
  badge?: string | null;
  selectedPatchIds?: string[];
}

export interface CartResponseItem {
  id: string;
  productId: string;
  sizeVariantId?: string;
  quantity: number;
  unitPrice?: number;
  finalPrice?: number;
  selectedPatchIds?: string[];
  sizeVariant?: {
    colorVariantId?: string;
    colorVariant?: { id: string };
  } | null;
}

export interface CartResponse {
  cart: {
    items: CartResponseItem[];
  };
  resolvedItems?: ResolvedCartItem[];
}

export interface ResolveCartRequest {
  items: CartItem[];
}

export interface ResolveCartResponse {
  resolvedItems: ResolvedCartItem[];
}

export interface AddItemRequest {
  productId: string;
  colorVariantId: string;
  sizeVariantId: string;
  quantity?: number;
  selectedPatchIds?: string[];
}

export interface MergeCartRequest {
  guestItems: GuestCartItem[];
}

/**
 * Fetch the user's cart from the API
 */
export async function fetchCart(): Promise<CartResponse> {
  const response = await fetch("/api/cart");
  if (!response.ok) {
    throw new Error("Failed to load cart");
  }
  return response.json();
}

/**
 * Add an item to the cart
 */
export async function addItem(params: AddItemRequest): Promise<void> {
  const response = await fetch("/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: params.productId,
      colorVariantId: params.colorVariantId,
      sizeVariantId: params.sizeVariantId,
      quantity: params.quantity ?? 1,
      selectedPatchIds: params.selectedPatchIds ?? [],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to add item to cart");
  }
}

/**
 * Update a cart item's quantity
 */
export async function updateItem(itemId: string, quantity: number): Promise<void> {
  const response = await fetch(`/api/cart/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    throw new Error("Failed to update cart item");
  }
}

/**
 * Remove an item from the cart
 */
export async function removeItem(itemId: string): Promise<void> {
  const response = await fetch(`/api/cart/items/${itemId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const errorMessage = data?.error || "Failed to remove cart item";
    throw new Error(errorMessage);
  }
}

/**
 * Clear all items from the cart
 */
export async function clearCart(): Promise<void> {
  const response = await fetch("/api/cart/clear", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to clear cart");
  }
}

/**
 * Merge guest cart items into user cart
 */
export async function mergeCart(guestItems: GuestCartItem[]): Promise<void> {
  const response = await fetch("/api/cart/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestItems }),
  });

  if (!response.ok) {
    throw new Error("Failed to merge cart");
  }
}

/**
 * Resolve guest cart items to get display data
 */
export async function resolveCart(items: CartItem[]): Promise<ResolveCartResponse> {
  const response = await fetch("/api/cart/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        colorVariantId: item.colorVariantId,
        sizeVariantId: item.sizeVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        finalPrice: item.finalPrice,
        selectedPatchIds: item.selectedPatchIds || [],
      })),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to resolve cart items");
  }

  return response.json();
}

