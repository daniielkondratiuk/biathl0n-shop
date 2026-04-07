import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Patch } from "@prisma/client";

const updatePatchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  price: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function getPatchById(id: string) {
  const patch = await prisma.patch.findUnique({
    where: { id },
  });

  if (!patch) {
    throw new Error("Patch not found");
  }

  return patch;
}

export interface UpdatePatchError {
  status: number;
  body: {
    error: string;
    details?: unknown;
  };
}

export async function updatePatchById(
  id: string,
  input: unknown
): Promise<{ patch: Patch } | UpdatePatchError> {
  const body: Record<string, unknown> = { ...(input as Record<string, unknown>) };

  // Convert price to cents if provided
  if (body.price !== undefined) {
    body.price = Math.round(Number(body.price) * 100);
  }

  try {
    const data = updatePatchSchema.parse(body);

    // Check if slug already exists (if updating slug)
    if (data.slug) {
      const existing = await prisma.patch.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        return {
          status: 400,
          body: {
            error: "Patch with this slug already exists",
          },
        };
      }
    }

    const patch = await prisma.patch.update({
      where: { id },
      data,
    });

    return { patch };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: {
          error: "Invalid input",
          details: error.issues,
        },
      };
    }
    throw error;
  }
}

export async function deletePatchById(id: string) {
  await prisma.patch.delete({
    where: { id },
  });
}

