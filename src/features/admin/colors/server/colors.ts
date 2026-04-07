import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { generateSlug } from "@/lib/utils/slug";
import type { Color } from "@prisma/client";

const createColorSchema = z.object({
  name: z.string().min(1, "Color name is required"),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Hex must be a valid color code (e.g., #FF0000)"),
});

/**
 * Canonical color order - must match the order in scripts/seed-colors.ts
 * This order is used for consistent display across the application.
 */
const CANONICAL_COLOR_ORDER = [
  "black",
  "gray",
  "light-gray",
  "white",
  "green",
  "red",
  "dark-red",
  "brown",
  "light-brown",
  "blue",
  "light-blue",
  "orange",
] as const;

/**
 * Sorts colors according to canonical order.
 * Colors not in canonical order appear at the end, sorted alphabetically.
 */
function sortColorsByCanonicalOrder<T extends { slug: string }>(colors: T[]): T[] {
  const orderMap = new Map<string, number>(CANONICAL_COLOR_ORDER.map((slug, index) => [slug, index]));
  
  return [...colors].sort((a, b) => {
    const aIndex = orderMap.get(a.slug);
    const bIndex = orderMap.get(b.slug);
    
    // Both in canonical order
    if (aIndex !== undefined && bIndex !== undefined) {
      return aIndex - bIndex;
    }
    
    // Only a in canonical order
    if (aIndex !== undefined) {
      return -1;
    }
    
    // Only b in canonical order
    if (bIndex !== undefined) {
      return 1;
    }
    
    // Neither in canonical order - sort alphabetically by slug
    return a.slug.localeCompare(b.slug);
  });
}

export async function getAdminColors() {
  const allColors = await prisma.color.findMany();
  
  // Filter to only canonical colors (exclude obsolete colors like "Beige")
  // This ensures obsolete colors don't appear in product creation/update UI,
  // even if they still exist in DB due to product references
  const canonicalSlugs = new Set<string>(CANONICAL_COLOR_ORDER);
  const canonicalColors = allColors.filter(c => canonicalSlugs.has(c.slug));
  
  // Sort by canonical order
  const sortedColors = sortColorsByCanonicalOrder(canonicalColors);

  return { colors: sortedColors };
}

export interface CreateAdminColorError {
  status: number;
  body: {
    error: string;
    details?: unknown;
    messages?: string;
  };
}

export async function createAdminColor(
  input: unknown
): Promise<{ status: number; body: { color: Color } } | CreateAdminColorError> {
  try {
    const parsed = createColorSchema.safeParse(input);

    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map((err) =>
        `${err.path.join(".")}: ${err.message}`
      ).join(", ");

      return {
        status: 400,
        body: {
          error: "Invalid input",
          details: parsed.error.flatten(),
          messages: errorMessages,
        },
      };
    }

    const data = parsed.data;
    const slug = generateSlug(data.name);

    // Check if slug already exists
    const existing = await prisma.color.findUnique({
      where: { slug },
    });
    if (existing) {
      return {
        status: 400,
        body: {
          error: "Color with this name already exists",
        },
      };
    }

    const color = await prisma.color.create({
      data: {
        name: data.name,
        slug,
        hex: data.hex.toUpperCase(),
      },
    });

    return { status: 201, body: { color } };
  } catch (error) {
    console.error("Error creating color:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create color";
    return {
      status: 500,
      body: {
        error: "Failed to create color",
        details: errorMessage,
      },
    };
  }
}

