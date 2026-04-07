import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Patch } from "@prisma/client";

const createPatchSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image: z.string().url(),
  price: z.number().positive(),
  isActive: z.boolean().default(true),
});

export async function listPatches() {
  const patches = await prisma.patch.findMany({
    orderBy: { createdAt: "desc" },
  });
  return { patches };
}

export interface CreatePatchError {
  status: number;
  body: {
    error: string;
    details?: unknown;
  };
}

export async function createPatch(
  input: unknown
): Promise<{ patch: Patch } | CreatePatchError> {
  try {
    const body = input as Record<string, unknown>;
    const parsed = createPatchSchema.safeParse({
      ...body,
      price: Math.round(Number(body.price) * 100), // Convert to cents
    });

    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "Invalid input",
          details: parsed.error.issues,
        },
      };
    }

    const data = parsed.data;

    // Check if slug already exists
    const existing = await prisma.patch.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return {
        status: 400,
        body: {
          error: "Patch with this slug already exists",
        },
      };
    }

    const patch = await prisma.patch.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        price: data.price,
        isActive: data.isActive,
      },
    });

    return { patch };
  } catch (error) {
    console.error("Error creating patch:", error);
    return {
      status: 500,
      body: {
        error: "Failed to create patch",
      },
    };
  }
}

