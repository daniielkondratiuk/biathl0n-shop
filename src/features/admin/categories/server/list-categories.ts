import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Category } from "@prisma/client";

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
});

export async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return categories;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateCategoryError {
  status: number;
  error: string;
  details?: unknown;
}

export async function createCategory(
  input: unknown
): Promise<{ category: Category } | CreateCategoryError> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 400,
      error: "Invalid input",
      details: parsed.error.flatten(),
    };
  }

  const created = await prisma.category.create({
    data: parsed.data,
  });

  return { category: created };
}

