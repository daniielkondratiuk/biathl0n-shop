// src/features/products/ui/add-to-cart-button.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart";

interface AddToCartButtonProps {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  selectedPatchIds?: string[];
  disabled?: boolean;
}

export function AddToCartButton({
  productId,
  colorVariantId = null,
  sizeVariantId = null,
  selectedPatchIds = [],
  disabled = false,
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const t = useTranslations("product");

  async function handleAdd() {
    if (!sizeVariantId || !colorVariantId) {
      return;
    }

    setLoading(true);
    setAdded(false);
    try {
      await addItem({
        productId,
        colorVariantId,
        sizeVariantId,
        selectedPatchIds,
        quantity: 1,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button 
      type="button" 
      onClick={handleAdd} 
      disabled={loading || disabled || !sizeVariantId || !colorVariantId}
      variant="primary"
      size="md"
      className="w-full"
    >
      {loading
        ? t("adding")
        : added
        ? t("addedToCart")
        : disabled
        ? t("selectSize")
        : t("addToCart")}
    </Button>
  );
}

