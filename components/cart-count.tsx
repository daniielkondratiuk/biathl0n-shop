// components/cart-count.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getCartForIdentifiers } from "@/features/cart/server/cart-summary";

export async function CartCount() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const anonymousToken = cookieStore.get("predators_cart")?.value ?? null;

  const cart = await getCartForIdentifiers({
    userId: session?.user.id,
    anonymousToken,
  });

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <Link
      href="/cart"
      className="text-base font-medium text-foreground transition hover:text-muted-foreground"
    >
      My Cart {itemCount > 0 && `(${itemCount})`}
    </Link>
  );
}

