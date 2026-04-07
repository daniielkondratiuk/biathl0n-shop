import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import { generateSizeVariantSKU } from "@/lib/utils/sku-generator";
import { generateSlug, makeUniqueSlug } from "@/lib/utils/slug";
import { commitTempImagesIfNeeded } from "./product-image-commit";
import { deleteProductImageFileByUrl } from "@/lib/utils/product-image-cleanup";
import type { AdminProductTranslationsInput } from "../model/types";
import { getRequiredAdminProductLanguageCodes } from "@/server/services/languages";

// Custom string validator that accepts URLs or relative paths
const urlOrPath = z.string().refine(
  (val) => {
    if (!val || val.trim() === "") return true;
    return val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/");
  },
  { message: "Must be a valid URL or path starting with /" }
);

const imageSchema = z.object({
  url: urlOrPath,
  role: z.enum(["MAIN", "MAIN_DETAIL", "GALLERY"]),
  order: z.number().int().nonnegative().default(0),
});

const sizeVariantSchema = z.object({
  id: z.string().optional(), // For updates
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  stock: z.number().int().nonnegative(),
  priceDiff: z.number().int().default(0),
});

const colorVariantSchema = z.object({
  id: z.string().optional(), // For updates
  colorId: z.string().min(1, "Color ID is required"),
  priceDiff: z.number().int().default(0),
  isActive: z.boolean().default(true),
  images: z.array(imageSchema).default([]),
  sizes: z.array(sizeVariantSchema).default([]),
});

const translationInputSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  basePrice: z.number().int().nonnegative().optional(),
  categoryId: z.string().min(1).optional(),
  gender: z.enum(["MEN", "WOMEN", "KIDS", "UNISEX"]).optional().nullable(),
  badge: z.enum(["NEW", "BESTSELLER", "SALE", "LIMITED", "BACKINSTOCK", "TRENDING"]).optional().nullable(),
  defaultPatchIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  showInHero: z.boolean().optional(),
  colorVariants: z.array(colorVariantSchema).optional(), // undefined = don't update, [] = delete all
  orderedVariantIds: z.array(z.string()).optional(), // variant IDs in desired display order
  translations: z.record(z.string(), translationInputSchema).optional(),
  // Legacy fields
  name: z.string().optional(),
  price: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  visible: z.boolean().optional(),
});

type PersistableTranslation = {
  locale: string;
  title: string;
  description: string | null;
};

function normalizeTranslationText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildPersistableTranslations(
  translations: AdminProductTranslationsInput | undefined,
  allowedLocaleCodes: readonly string[],
  englishFallbackTitle: string | undefined,
  englishFallbackDescription: string | null | undefined,
): PersistableTranslation[] {
  const normalized: PersistableTranslation[] = [];

  for (const locale of allowedLocaleCodes) {
    const source = translations?.[locale];
    const title =
      locale === "en"
        ? normalizeTranslationText(source?.title ?? englishFallbackTitle)
        : normalizeTranslationText(source?.title);
    const description =
      locale === "en"
        ? normalizeTranslationText(source?.description ?? englishFallbackDescription)
        : normalizeTranslationText(source?.description);

    if (!title && !description) {
      continue;
    }

    normalized.push({
      locale,
      title,
      description: description || null,
    });
  }

  return normalized;
}

// Validate image role constraints
function validateImageRoles(images: Array<{ url: string; role: string; order: number }>): string | null {
  // Allow empty images array for updates (user might be removing all images)
  if (images.length === 0) {
    return null; // Empty is allowed for updates, but will be validated at product level
  }

  const mainImages = images.filter((img) => img.role === "MAIN");
  const mainDetailImages = images.filter((img) => img.role === "MAIN_DETAIL");

  // Must have exactly one MAIN image
  if (mainImages.length === 0) {
    return "Each color variant must have exactly one MAIN image";
  }

  if (mainImages.length > 1) {
    return "Only one MAIN image is allowed per color variant";
  }

  // MAIN_DETAIL cannot exist without MAIN
  if (mainDetailImages.length > 0 && mainImages.length === 0) {
    return "MAIN_DETAIL image requires a MAIN image";
  }

  // MAIN_DETAIL cannot equal MAIN
  if (mainImages.length === 1 && mainDetailImages.length > 0) {
    const mainUrl = mainImages[0].url;
    if (mainDetailImages.some((img) => img.url === mainUrl)) {
      return "MAIN_DETAIL image cannot be the same as MAIN image";
    }
  }

  // Only one MAIN_DETAIL allowed
  if (mainDetailImages.length > 1) {
    return "Only one MAIN_DETAIL image is allowed per color variant";
  }

  return null;
}

export interface UpdateProductError {
  status: number;
  error: string;
  details?: unknown;
  messages?: string;
}

export async function updateAdminProductById(
  productId: string,
  rawJson: unknown
): Promise<{ product: unknown } | UpdateProductError> {
  // Clean up payload
  const raw = rawJson as Record<string, unknown>;
  const cleaned = {
    ...raw,
    description: raw.description !== null && raw.description !== undefined ? raw.description : undefined,
    gender: raw.gender && raw.gender !== "" ? raw.gender : undefined,
    badge: raw.badge && raw.badge !== "" ? raw.badge : undefined,
    defaultPatchIds: Array.isArray(raw.defaultPatchIds) ? raw.defaultPatchIds : [],
    // Only set colorVariants if explicitly provided (undefined = don't update, [] = delete all)
    colorVariants: raw.colorVariants !== undefined 
      ? (Array.isArray(raw.colorVariants) ? raw.colorVariants : [])
      : undefined,
    orderedVariantIds: Array.isArray(raw.orderedVariantIds) ? raw.orderedVariantIds : undefined,
  };

  // Validate image roles for each color variant (only if images exist)
  if (cleaned.colorVariants && Array.isArray(cleaned.colorVariants) && cleaned.colorVariants.length > 0) {
    for (const colorVariant of cleaned.colorVariants) {
      const cv = colorVariant as { images?: Array<{ url: string; role: string; order: number }> };
      if (cv.images && Array.isArray(cv.images) && cv.images.length > 0) {
        const validationError = validateImageRoles(cv.images);
        if (validationError) {
          return {
            status: 400,
            error: validationError,
          };
        }
      }
    }
  }

  const parsed = updateProductSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues || [];
    const flattened = parsed.error.flatten();

    const errorMessages = issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }).join(", ");

    return {
      status: 400,
      error: "Invalid input",
      details: flattened,
      messages: errorMessages || "Validation failed",
    };
  }

  const data = parsed.data;

  // Ensure slug uniqueness if updating (normalize + auto-suffix instead of error)
  let resolvedSlug: string | undefined;
  if (data.slug !== undefined) {
    const normalizedSlug = generateSlug(data.slug);
    resolvedSlug = await makeUniqueSlug(normalizedSlug, async (candidate) => {
      const existing = await prisma.product.findFirst({
        where: { slug: candidate, id: { not: productId } },
      });
      return !!existing;
    });
  }

  // Get product for SKU generation
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true, title: true, description: true },
  });

  if (!product) {
    return {
      status: 404,
      error: "Product not found",
    };
  }

  const productSlug = resolvedSlug || product.slug;
  const requiredLocaleCodes = await getRequiredAdminProductLanguageCodes();
  const persistableTranslations = buildPersistableTranslations(
    data.translations,
    requiredLocaleCodes,
    data.title ?? product.title,
    data.description ?? product.description,
  );
  const englishTranslation = persistableTranslations.find((translation) => translation.locale === "en");
  const shouldProcessTranslations =
    data.translations !== undefined ||
    data.title !== undefined ||
    data.description !== undefined;

  if (shouldProcessTranslations && !englishTranslation?.title) {
    return {
      status: 400,
      error: "English title is required",
    };
  }

  // ============================================================================
  // PHASE 1: PREPARATION (outside transaction)
  // ============================================================================
  // Read existing state, validate input, compute diffs, prepare plain data payloads
  // All business logic, SKU generation, and data transformation happens here

  // Prepare product base update data
  const productUpdateData: Record<string, unknown> = {};
  if (data.title !== undefined) {
    const nextEnglishTitle = englishTranslation?.title ?? data.title;
    productUpdateData.title = nextEnglishTitle;
    productUpdateData.name = data.name || nextEnglishTitle;
  }
  if (resolvedSlug !== undefined) productUpdateData.slug = resolvedSlug;
  if (data.description !== undefined) {
    const nextEnglishDescription =
      englishTranslation?.description ?? (data.description ? data.description : null);
    productUpdateData.description = nextEnglishDescription;
  }
  if (data.basePrice !== undefined) {
    productUpdateData.basePrice = data.basePrice;
    // Keep legacy 'price' field in sync with basePrice for backward compatibility
    productUpdateData.price = data.price ?? data.basePrice;
  } else if (data.price !== undefined) {
    productUpdateData.price = data.price;
  }
  if (data.stock !== undefined) productUpdateData.stock = data.stock;
  if (data.categoryId !== undefined) productUpdateData.categoryId = data.categoryId;
  if (data.gender !== undefined) productUpdateData.gender = data.gender || null;
  if (data.badge !== undefined) productUpdateData.badge = data.badge || null;
  if (data.defaultPatchIds !== undefined) productUpdateData.defaultPatchIds = data.defaultPatchIds || [];
  if (data.isActive !== undefined) {
    productUpdateData.isActive = data.isActive;
    productUpdateData.visible = data.visible ?? data.isActive;
  }
  if (data.showInHero !== undefined) productUpdateData.showInHero = data.showInHero;

  // Prepare flattened color variant operations (if provided)
  // All data structures are plain objects - no functions, no promises
  let ops: {
    colorVariantsToDelete: string[];
    colorVariantsToUpdate: Array<{ id: string; colorId: string; priceDiff: number; isActive: boolean }>;
    colorVariantsToCreate: Array<{ productId: string; colorId: string; priceDiff: number; isActive: boolean; sortOrder: number }>;
    imagesToDelete: string[]; // colorVariantIds whose images should be deleted
    imagesToCreate: Array<{ colorVariantId: string; url: string; role: string; order: number }>;
    sizesToUpdate: Array<{ id: string; stock: number; priceDiff: number }>;
    sizesToCreate: Array<{ colorVariantId: string; size: string; stock: number; priceDiff: number; sku: string }>;
  } | null = null;

  // Collect existing image URLs for reconciliation (before processing changes)
  let existingImageUrls: string[] = [];
  if (data.colorVariants !== undefined) {
    // Read existing state (orderBy sortOrder for consistency)
    const existingColorVariants = await prisma.productColorVariant.findMany({
      where: { productId },
      include: { images: true, sizes: true },
      orderBy: { sortOrder: "asc" },
    });

    // Collect all existing image URLs for this product (for file cleanup)
    existingImageUrls = existingColorVariants.flatMap((cv) =>
      cv.images.map((img) => img.url).filter((url) => url.startsWith(`/uploads/products/${productId}/`))
    );

    const maxSortOrder =
      existingColorVariants.length > 0
        ? Math.max(...existingColorVariants.map((cv) => cv.sortOrder ?? 0))
        : -1;

    const existingColorVariantIds = new Set(existingColorVariants.map((cv) => cv.id));
    const incomingColorVariantIds = new Set(
      data.colorVariants
        .map((cv) => cv.id)
        .filter((id: string | undefined): id is string => !!id)
    );

    // Compute deletions
    const colorVariantsToDelete = data.colorVariants.length === 0
      ? existingColorVariants.map((cv) => cv.id)
      : existingColorVariants
          .filter((cv) => !incomingColorVariantIds.has(cv.id))
          .map((cv) => cv.id);

    // Prepare operations arrays
    const colorVariantsToUpdate: Array<{ id: string; colorId: string; priceDiff: number; isActive: boolean }> = [];
    const colorVariantsToCreate: Array<{ productId: string; colorId: string; priceDiff: number; isActive: boolean; sortOrder: number }> = [];
    const imagesToDelete: string[] = [];
    const imagesToCreate: Array<{ colorVariantId: string; url: string; role: string; order: number }> = [];
    const sizesToUpdate: Array<{ id: string; stock: number; priceDiff: number }> = [];
    const sizesToCreate: Array<{ colorVariantId: string; size: string; stock: number; priceDiff: number; sku: string }> = [];

    if (data.colorVariants.length > 0) {
      // Validate all colors exist
      const colorIds = [...new Set(data.colorVariants.map((cv) => cv.colorId))];
      const colors = await prisma.color.findMany({
        where: { id: { in: colorIds } },
        select: { id: true, slug: true },
      });

      const colorMap = new Map(colors.map((c) => [c.id, c]));
      for (const colorId of colorIds) {
        if (!colorMap.has(colorId)) {
          return {
            status: 400,
            error: `Color with ID ${colorId} not found`,
          };
        }
      }

      // Build map of existing sizes for lookup
      const existingSizeMap = new Map<string, { id: string; colorVariantId: string }>();
      for (const cv of existingColorVariants) {
        for (const size of cv.sizes) {
          existingSizeMap.set(`${cv.id}:${size.size}`, {
            id: size.id,
            colorVariantId: cv.id,
          });
        }
      }

      // Commit temp images for all color variants before processing
      // This ensures DB never stores /temp/* URLs
      const processedColorVariants = await Promise.all(
        data.colorVariants.map(async (colorVariantData) => {
          if (!colorVariantData.images || colorVariantData.images.length === 0) {
            return { ...colorVariantData, committedImages: [] };
          }

          // Commit temp images to product directory
          const committedImages = await commitTempImagesIfNeeded({
            productId,
            images: colorVariantData.images,
          });

          return {
            ...colorVariantData,
            committedImages,
          };
        })
      );

      // Process each incoming color variant and flatten all operations
      for (const variantData of processedColorVariants) {
        const color = colorMap.get(variantData.colorId)!;
        const isUpdate = variantData.id && existingColorVariantIds.has(variantData.id);

        if (isUpdate) {
          // Existing color variant - prepare update
          const colorVariantId = variantData.id!;
          colorVariantsToUpdate.push({
            id: colorVariantId,
            colorId: variantData.colorId,
            priceDiff: variantData.priceDiff ?? 0,
            isActive: variantData.isActive ?? true,
          });

          // Mark images for deletion (will be recreated)
          imagesToDelete.push(colorVariantId);

          // Prepare new images with committed URLs (never /temp/*)
          if (variantData.committedImages && variantData.committedImages.length > 0) {
            for (const img of variantData.committedImages) {
              imagesToCreate.push({
                colorVariantId,
                url: img.url, // This is now /uploads/products/{productId}/... never /temp/*
                role: img.role,
                order: img.order ?? 0,
              });
            }
          }

          // Process sizes for existing color variant
          if (variantData.sizes && variantData.sizes.length > 0) {
            for (const sizeData of variantData.sizes) {
              const sizeKey = `${colorVariantId}:${sizeData.size}`;
              const existingSize = existingSizeMap.get(sizeKey);
              if (existingSize) {
                sizesToUpdate.push({
                  id: existingSize.id,
                  stock: sizeData.stock,
                  priceDiff: sizeData.priceDiff ?? 0,
                });
              } else {
                sizesToCreate.push({
                  colorVariantId,
                  size: sizeData.size,
                  stock: sizeData.stock,
                  priceDiff: sizeData.priceDiff ?? 0,
                  sku: generateSizeVariantSKU(productSlug, color.slug, sizeData.size),
                });
              }
            }
          }
        } else {
          // New color variant - append to end (sortOrder = max + 1 + index)
          const tempMarker = `NEW_${variantData.colorId}`;
          colorVariantsToCreate.push({
            productId,
            colorId: variantData.colorId,
            priceDiff: variantData.priceDiff ?? 0,
            isActive: variantData.isActive ?? true,
            sortOrder: maxSortOrder + 1 + colorVariantsToCreate.length,
          });

          // Prepare images with committed URLs (will be matched to created color variant by colorId)
          if (variantData.committedImages && variantData.committedImages.length > 0) {
            for (const img of variantData.committedImages) {
              imagesToCreate.push({
                colorVariantId: tempMarker, // Temporary marker
                url: img.url, // This is now /uploads/products/{productId}/... never /temp/*
                role: img.role,
                order: img.order ?? 0,
              });
            }
          }

          // Prepare sizes (will be matched to created color variant by colorId)
          if (variantData.sizes && variantData.sizes.length > 0) {
            for (const sizeData of variantData.sizes) {
              sizesToCreate.push({
                colorVariantId: tempMarker, // Temporary marker
                size: sizeData.size,
                stock: sizeData.stock,
                priceDiff: sizeData.priceDiff ?? 0,
                sku: generateSizeVariantSKU(productSlug, color.slug, sizeData.size),
              });
            }
          }
        }
      }
    }

    ops = {
      colorVariantsToDelete,
      colorVariantsToUpdate,
      colorVariantsToCreate,
      imagesToDelete,
      imagesToCreate,
      sizesToUpdate,
      sizesToCreate,
    };
  }

  // ============================================================================
  // PHASE 2: EXECUTION (batch transactions - no interactive tx to avoid P2028)
  // ============================================================================
  // Use batch transaction form prisma.$transaction([...]) instead of interactive
  // All operations use stable unique keys (composite constraints) for upserts
  // No dependency on returned IDs - all references use (productId, colorId, size) tuples

  // Build batch transaction operations array (must be PrismaPromise, not Promise)
  const transactionOps: Prisma.PrismaPromise<unknown>[] = [];

  // 1. Update product base data
  if (Object.keys(productUpdateData).length > 0) {
    transactionOps.push(
      prisma.product.update({
        where: { id: productId },
        data: productUpdateData as Prisma.ProductUncheckedUpdateInput,
      })
    );
  }

  // 2. Handle color variants if provided
  if (ops) {
    // 2a. Batch delete: images, sizes, and color variants
    if (ops.colorVariantsToDelete.length > 0) {
      transactionOps.push(
        prisma.productImage.deleteMany({
          where: { colorVariantId: { in: ops.colorVariantsToDelete } },
        })
      );
      transactionOps.push(
        prisma.productSizeVariant.deleteMany({
          where: { colorVariantId: { in: ops.colorVariantsToDelete } },
        })
      );
      transactionOps.push(
        prisma.productColorVariant.deleteMany({
          where: { id: { in: ops.colorVariantsToDelete } },
        })
      );
    }

    // 2b. Upsert existing color variants using (productId, colorId) unique constraint
    for (const updateData of ops.colorVariantsToUpdate) {
      transactionOps.push(
        prisma.productColorVariant.upsert({
          where: {
            productId_colorId: {
              productId,
              colorId: updateData.colorId,
            },
          },
          update: {
            priceDiff: updateData.priceDiff,
            isActive: updateData.isActive,
          },
          create: {
            productId,
            colorId: updateData.colorId,
            priceDiff: updateData.priceDiff,
            isActive: updateData.isActive,
          },
        })
      );
    }

    // 2c. Upsert new color variants using (productId, colorId) unique constraint
    for (const createData of ops.colorVariantsToCreate) {
      transactionOps.push(
        prisma.productColorVariant.upsert({
          where: {
            productId_colorId: {
              productId,
              colorId: createData.colorId,
            },
          },
          update: {
            priceDiff: createData.priceDiff,
            isActive: createData.isActive,
          },
          create: {
            productId: createData.productId,
            colorId: createData.colorId,
            sortOrder: createData.sortOrder,
            priceDiff: createData.priceDiff,
            isActive: createData.isActive,
          },
        })
      );
    }
  }

  // Execute first batch (product update, deletes, color variant upserts)
  await prisma.$transaction(transactionOps);

  // 3. Fetch color variant IDs needed for images and sizes
  // After batch transaction, fetch color variants to get their IDs
  let colorVariantIdMap = new Map<string, string>(); // colorId -> colorVariantId
  if (ops) {
    const allColorIds = new Set<string>();
    if (ops.colorVariantsToUpdate.length > 0) {
      ops.colorVariantsToUpdate.forEach((cv) => allColorIds.add(cv.colorId));
    }
    if (ops.colorVariantsToCreate.length > 0) {
      ops.colorVariantsToCreate.forEach((cv) => allColorIds.add(cv.colorId));
    }

    if (allColorIds.size > 0) {
      const colorVariants = await prisma.productColorVariant.findMany({
        where: {
          productId,
          colorId: { in: Array.from(allColorIds) },
        },
        select: { id: true, colorId: true },
      });
      colorVariantIdMap = new Map(
        colorVariants.map((cv) => [cv.colorId, cv.id])
      );
    }

    // Also add existing color variant IDs for updates
    if (ops.colorVariantsToUpdate.length > 0) {
      const existingIds = ops.colorVariantsToUpdate.map((cv) => cv.id);
      const existingVariants = await prisma.productColorVariant.findMany({
        where: { id: { in: existingIds } },
        select: { id: true, colorId: true },
      });
      existingVariants.forEach((cv) => {
        colorVariantIdMap.set(cv.colorId, cv.id);
      });
    }
  }

  // 4. Execute second batch: images and sizes (now we have colorVariantIds)
  const secondBatchOps: Prisma.PrismaPromise<unknown>[] = [];

  if (ops) {
    // 4a. Delete images for updated color variants (will be recreated)
    if (ops.imagesToDelete.length > 0) {
      secondBatchOps.push(
        prisma.productImage.deleteMany({
          where: { colorVariantId: { in: ops.imagesToDelete } },
        })
      );
    }

    // 4b. Create images for all color variants
    const allImagePayloads: Array<{
      colorVariantId: string;
      url: string;
      role: "MAIN" | "MAIN_DETAIL" | "GALLERY";
      order: number;
    }> = [];

    for (const img of ops.imagesToCreate) {
      let colorVariantId: string | undefined;
      if (img.colorVariantId.startsWith("NEW_")) {
        const colorId = img.colorVariantId.replace("NEW_", "");
        colorVariantId = colorVariantIdMap.get(colorId);
      } else {
        colorVariantId = img.colorVariantId;
      }

      if (colorVariantId) {
        allImagePayloads.push({
          colorVariantId,
          url: img.url,
          role: img.role as "MAIN" | "MAIN_DETAIL" | "GALLERY",
          order: img.order,
        });
      }
    }

    if (allImagePayloads.length > 0) {
      secondBatchOps.push(
        prisma.productImage.createMany({ data: allImagePayloads })
      );
    }

    // 4c. Update size variants (individual updates - different data per size)
    for (const sizeUpdate of ops.sizesToUpdate) {
      secondBatchOps.push(
        prisma.productSizeVariant.update({
          where: { id: sizeUpdate.id },
          data: {
            stock: sizeUpdate.stock,
            priceDiff: sizeUpdate.priceDiff,
          },
        })
      );
    }

    // 4d. Upsert size variants for existing color variants
    const sizesForExisting = ops.sizesToCreate.filter(
      (s) => !s.colorVariantId.startsWith("NEW_")
    );
    for (const sizeData of sizesForExisting) {
      secondBatchOps.push(
        prisma.productSizeVariant.upsert({
          where: {
            colorVariantId_size: {
              colorVariantId: sizeData.colorVariantId,
              size: sizeData.size as "XS" | "S" | "M" | "L" | "XL" | "XXL",
            },
          },
          update: {
            stock: sizeData.stock,
            priceDiff: sizeData.priceDiff,
            sku: sizeData.sku,
          },
          create: {
            colorVariantId: sizeData.colorVariantId,
            size: sizeData.size as "XS" | "S" | "M" | "L" | "XL" | "XXL",
            stock: sizeData.stock,
            priceDiff: sizeData.priceDiff,
            sku: sizeData.sku,
          },
        })
      );
    }

    // 4e. Upsert size variants for new color variants
    const sizesForNew = ops.sizesToCreate.filter((s) =>
      s.colorVariantId.startsWith("NEW_")
    );
    for (const sizeData of sizesForNew) {
      const colorId = sizeData.colorVariantId.replace("NEW_", "");
      const colorVariantId = colorVariantIdMap.get(colorId);
      if (colorVariantId) {
        secondBatchOps.push(
          prisma.productSizeVariant.upsert({
            where: {
              colorVariantId_size: {
                colorVariantId,
                size: sizeData.size as "XS" | "S" | "M" | "L" | "XL" | "XXL",
              },
            },
            update: {
              stock: sizeData.stock,
              priceDiff: sizeData.priceDiff,
              sku: sizeData.sku,
            },
            create: {
              colorVariantId,
              size: sizeData.size as "XS" | "S" | "M" | "L" | "XL" | "XXL",
              stock: sizeData.stock,
              priceDiff: sizeData.priceDiff,
              sku: sizeData.sku,
            },
          })
        );
      }
    }
  }

  // Execute second batch
  if (secondBatchOps.length > 0) {
    await prisma.$transaction(secondBatchOps);
  }

  // 7. Handle translations dynamically for enabled admin locales
  if (shouldProcessTranslations) {
    const persistedLocales = persistableTranslations.map((translation) => translation.locale);

    const translationOps: Prisma.PrismaPromise<unknown>[] = [
      prisma.productTranslation.deleteMany({
        where: {
          productId,
          locale: {
            in: requiredLocaleCodes,
            notIn: persistedLocales,
          },
        },
      }),
    ];

    for (const translation of persistableTranslations) {
      translationOps.push(
        prisma.productTranslation.upsert({
          where: {
            productId_locale: {
              productId,
              locale: translation.locale,
            },
          },
          update: {
            title: translation.title,
            description: translation.description,
          },
          create: {
            productId,
            locale: translation.locale,
            title: translation.title,
            description: translation.description,
          },
        }),
      );
    }

    await prisma.$transaction(translationOps);
  }

  // 5. Reconcile filesystem: delete removed image files
  if (ops && data.colorVariants !== undefined) {
    // Collect new image URLs after commit
    const newImageUrls = new Set<string>();
    for (const img of ops.imagesToCreate) {
      if (img.url.startsWith(`/uploads/products/${productId}/`)) {
        newImageUrls.add(img.url);
      }
    }

    // Find URLs that were removed (exist in DB but not in new set)
    const removedUrls = existingImageUrls.filter((url) => !newImageUrls.has(url));

    // Delete removed files from filesystem (best effort)
    if (removedUrls.length > 0) {
      let deletedCount = 0;
      const deletionErrors: string[] = [];

      for (const url of removedUrls) {
        try {
          const deleted = await deleteProductImageFileByUrl(productId, url);
          if (deleted) {
            deletedCount++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          deletionErrors.push(`${url}: ${errorMsg}`);
          // Continue with other deletions
        }
      }

      // DEV-only: Log deletion summary
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[product-update] product ${productId}: removedFiles=${deletedCount} failedFiles=${deletionErrors.length}`
        );
        if (deletionErrors.length > 0) {
          console.warn(`[product-update] Failed to delete:`, deletionErrors);
        }
      }
    }
  }

  // 6. Handle orderedVariantIds: update sortOrder = index in a transaction
  if (data.orderedVariantIds !== undefined && Array.isArray(data.orderedVariantIds) && data.orderedVariantIds.length > 0) {
    const variantIds = data.orderedVariantIds as string[];
    const belonging = await prisma.productColorVariant.findMany({
      where: { productId, id: { in: variantIds } },
      select: { id: true },
    });
    const belongingIds = new Set(belonging.map((v) => v.id));
    if (belongingIds.size !== variantIds.length) {
      return {
        status: 400,
        error: "orderedVariantIds must only contain variant IDs that belong to this product",
      };
    }
    await prisma.$transaction(
      variantIds.map((id, index) =>
        prisma.productColorVariant.update({
          where: { id, productId },
          data: { sortOrder: index },
        })
      )
    );
  }

  // 7. Return updated product with all relations (colorVariants ordered by sortOrder)
  const updated = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      colorVariants: {
        orderBy: { sortOrder: "asc" },
        include: {
          color: true,
          images: {
            orderBy: [{ role: "asc" }, { order: "asc" }],
          },
          sizes: {
            orderBy: { size: "asc" },
          },
        },
      },
      category: true,
    },
  });

  return { product: updated };
}

