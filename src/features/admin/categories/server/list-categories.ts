import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Category } from "@prisma/client";

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  translations: z.record(z.string(), z.object({
    description: z.string().nullable().optional(),
  })).optional(),
});

export async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { translations: true },
  });
  return categories;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  translations?: Record<string, { description?: string | null }>;
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

  const { translations, ...categoryData } = parsed.data;

  const created = await prisma.category.create({
    data: {
      ...categoryData,
      ...(translations && {
        translations: {
          create: Object.entries(translations)
            .filter(([, v]) => v.description && v.description.trim().length > 0)
            .map(([locale, v]) => ({
              locale,
              description: v.description ?? null,
            })),
        },
      }),
    },
  });

  return { category: created };
}

