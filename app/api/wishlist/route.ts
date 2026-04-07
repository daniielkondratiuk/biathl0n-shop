// app/api/wishlist/route.ts
import { getServerSession } from "next-auth/next";
import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";
import { getUserWishlist, addToWishlist, removeFromWishlist } from "@/features/wishlist/server/wishlist";

type GuestWishlistItem = {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
};

type CanonicalWishlistItem = {
  productId: string;
  colorVariantId: string | null;
  sizeVariantId: string | null;
  product: unknown;
};

const productInclude = {
  category: true,
  colorVariants: {
    where: { isActive: true },
    include: {
      color: {
        select: {
          id: true,
          name: true,
          nameFr: true,
          hex: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          role: true,
          order: true,
        },
        orderBy: [{ role: "asc" }, { order: "asc" }],
      },
      sizes: {
        select: {
          id: true,
          size: true,
          stock: true,
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

async function hydrateCanonicalItems(input: CanonicalWishlistItem[]): Promise<CanonicalWishlistItem[]> {
  if (input.length === 0) return [];
  const ids = [...new Set(input.map((item) => item.productId).filter((id) => id.trim().length > 0))];
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: productInclude as Prisma.ProductInclude,
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const hydrated: Array<CanonicalWishlistItem | null> = input.map((item) => {
      const product = productById.get(item.productId);
      if (!product) return null;
      return {
        productId: item.productId,
        colorVariantId: item.colorVariantId ?? null,
        sizeVariantId: item.sizeVariantId ?? null,
        product,
      };
    });
  return hydrated.filter((item): item is CanonicalWishlistItem => item !== null);
}

function normalizeGuestItems(input: unknown): GuestWishlistItem[] {
  if (!Array.isArray(input)) return [];
  const deduped = input
    .filter(
      (item): item is { productId: string; colorVariantId?: string | null; sizeVariantId?: string | null } =>
        !!item &&
        typeof item === "object" &&
        typeof (item as { productId?: unknown }).productId === "string" &&
        (item as { productId: string }).productId.trim().length > 0,
    )
    .map((item) => ({
      productId: item.productId.trim(),
      colorVariantId: typeof item.colorVariantId === "string" ? item.colorVariantId : null,
      sizeVariantId: typeof item.sizeVariantId === "string" ? item.sizeVariantId : null,
    }));

  const seen = new Set<string>();
  const result: GuestWishlistItem[] = [];
  for (const item of deduped) {
    const key = `${item.productId}:${item.colorVariantId ?? "none"}:${item.sizeVariantId ?? "none"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

async function resolveGuestWishlistItems(items: GuestWishlistItem[]) {
  if (items.length === 0) return [];

  const withColorVariant = items.filter((item) => !!item.colorVariantId);
  const withoutColorVariant = items.filter((item) => !item.colorVariantId);
  const colorVariantIds = [...new Set(withColorVariant.map((item) => item.colorVariantId as string))];
  const productIds = [...new Set(withoutColorVariant.map((item) => item.productId))];

  const [productsByColorVariant, productsById] = await Promise.all([
    colorVariantIds.length > 0
      ? prisma.product.findMany({
        where: {
          colorVariants: {
            some: {
              id: { in: colorVariantIds },
            },
          },
        },
        include: productInclude as Prisma.ProductInclude,
      })
      : Promise.resolve([]),
    productIds.length > 0
      ? prisma.product.findMany({
        where: { id: { in: productIds } },
        include: productInclude as Prisma.ProductInclude,
      })
      : Promise.resolve([]),
  ]);

  const products = [...productsByColorVariant, ...productsById];
  const productById = new Map(products.map((product) => [product.id, product]));
  const productByColorVariantId = new Map<string, (typeof products)[number]>();
  for (const product of productsByColorVariant) {
    const colorVariants = (product as { colorVariants?: Array<{ id: string }> }).colorVariants ?? [];
    for (const cv of colorVariants) {
      productByColorVariantId.set(cv.id, product);
    }
  }

  const resolved: Array<CanonicalWishlistItem | null> = items.map((item) => {
      const product = item.colorVariantId
        ? productByColorVariantId.get(item.colorVariantId)
        : productById.get(item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        colorVariantId: item.colorVariantId ?? null,
        sizeVariantId: item.sizeVariantId ?? null,
        product,
      };
    });

  return resolved.filter((item): item is CanonicalWishlistItem => item !== null);
}

function toCanonicalItems(input: Array<{
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  product: unknown;
}>): CanonicalWishlistItem[] {
  const canonical: Array<CanonicalWishlistItem | null> = input.map((item) => {
      const product = item.product as { id?: unknown } | null;
      const productId =
        typeof item.productId === "string" && item.productId.trim().length > 0
          ? item.productId
          : typeof product?.id === "string"
            ? product.id
            : null;
      if (!productId || !item.product) return null;
      return {
        productId,
        colorVariantId: item.colorVariantId ?? null,
        sizeVariantId: item.sizeVariantId ?? null,
        product: item.product,
      };
    });
  return canonical.filter((item): item is CanonicalWishlistItem => item !== null);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ mode: "guest", count: 0, items: [] });
    }

    const items = await hydrateCanonicalItems(toCanonicalItems(await getUserWishlist(session.user.id)));
    
    return NextResponse.json({ mode: "user", count: items.length, items });
  } catch {
    return NextResponse.json({ mode: "guest", count: 0, items: [] });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const json = (await request.json().catch(() => ({}))) as {
      productId?: unknown;
      colorVariantId?: unknown;
      sizeVariantId?: unknown;
      items?: unknown;
    };

    if (session?.user?.id) {
      if (typeof json.productId === "string") {
        const colorVariantId =
          typeof json.colorVariantId === "string" || json.colorVariantId === null
            ? json.colorVariantId
            : null;
        const sizeVariantId =
          typeof json.sizeVariantId === "string" || json.sizeVariantId === null
            ? json.sizeVariantId
            : null;
        await addToWishlist(session.user.id, json.productId, colorVariantId, sizeVariantId);
        revalidateTag(`wishlist:${session.user.id}`, "max");
      }

      const items = await hydrateCanonicalItems(toCanonicalItems(await getUserWishlist(session.user.id)));
      return NextResponse.json({ mode: "user", count: items.length, items });
    }

    const guestItems = normalizeGuestItems(json.items);
    if (guestItems.length === 0) {
      return NextResponse.json({ mode: "guest", count: 0, items: [] });
    }

    const items = await resolveGuestWishlistItems(guestItems);
    return NextResponse.json({ mode: "guest", count: items.length, items });
  } catch (error) {
    const session = await getServerSession(authOptions);
    return NextResponse.json({
      mode: session?.user?.id ? "user" : "guest",
      count: 0,
      items: [],
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const json = await request.json();
    const { productId, colorVariantId, sizeVariantId } = json as {
      productId: string;
      colorVariantId?: string | null;
      sizeVariantId?: string | null;
    };

    await removeFromWishlist(session.user.id, productId, colorVariantId, sizeVariantId);
    revalidateTag(`wishlist:${session.user.id}`, "max");
    
    const items = await getUserWishlist(session.user.id);
    
    return NextResponse.json({ items });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const status = errorMessage.includes("required") ? 400 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status },
    );
  }
}
