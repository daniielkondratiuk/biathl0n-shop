import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Category } from "@prisma/client";

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  nameFr: z.string().trim().optional().nullable(),
});

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  nameFr?: string | null;
}

export interface UpdateCategoryError {
  status: number;
  error: string;
  details?: unknown;
}

export async function updateCategoryById(
  id: string,
  input: unknown
): Promise<{ category: Category } | UpdateCategoryError> {
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 400,
      error: "Invalid input",
      details: parsed.error.flatten(),
    };
  }

  const { nameFr, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };

  if (Object.prototype.hasOwnProperty.call(parsed.data, "nameFr")) {
    const normalizedNameFr =
      nameFr && nameFr.trim().length > 0 ? nameFr.trim() : null;
    data.nameFr = normalizedNameFr;
  }

  const updated = await prisma.category.update({
    where: { id },
    data,
  });

  return { category: updated };
}

export async function deleteCategoryById(id: string): Promise<void> {
  await prisma.category.delete({
    where: { id },
  });
}

