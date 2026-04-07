import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import { generateSizeVariantSKU } from "@/lib/utils/sku-generator";
import { generateSlug, makeUniqueSlug } from "@/lib/utils/slug";
import { deleteProductImages } from "@/lib/utils/product-image-cleanup";
import type { AdminProductTranslationsInput } from "../model/types";
import { getRequiredAdminProductLanguageCodes } from "@/server/services/languages";
import { commitTempImagesIfNeeded } from "./product-image-commit";

// Custom string validator that accepts URLs or relative paths
const urlOrPath = z.string().refine(
  (val) => {
    if (!val || val.trim() === "") return true; // Empty is OK (optional)
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
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  stock: z.number().int().nonnegative(),
  priceDiff: z.number().int().default(0),
});

const colorVariantSchema = z.object({
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

const createProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  basePrice: z.number().int().nonnegative("Base price must be a positive number"),
  categoryId: z.string().min(1, "Category is required"),
  gender: z.enum(["MEN", "WOMEN", "KIDS", "UNISEX"]).optional().nullable(),
  badge: z.enum(["NEW", "BESTSELLER", "SALE", "LIMITED", "BACKINSTOCK", "TRENDING"]).optional().nullable(),
  defaultPatchIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  showInHero: z.boolean().default(false),
  colorVariants: z.array(colorVariantSchema).min(1, "At least one color variant is required for new products"),
  translations: z.record(z.string(), translationInputSchema).optional(),
  // Legacy fields for backward compatibility
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
  englishFallbackTitle: string,
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
  if (images.length === 0) {
    return "At least one image with MAIN role is required per color variant";
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

export interface CreateProductError {
  status: number;
  error: string;
  details?: unknown;
  messages?: string;
}

export async function createAdminProduct(
  input: unknown
): Promise<{ product: unknown } | CreateProductError> {
  // Clean up data
  const raw = input as Record<string, unknown>;
  const cleaned = {
    ...raw,
    description: raw.description !== null && raw.description !== undefined ? raw.description : undefined,
    gender: raw.gender && raw.gender !== "" ? raw.gender : undefined,
    badge: raw.badge && raw.badge !== "" ? raw.badge : undefined,
    defaultPatchIds: Array.isArray(raw.defaultPatchIds) ? raw.defaultPatchIds : [],
    colorVariants: Array.isArray(raw.colorVariants) ? raw.colorVariants : [],
  };

  // Validate image roles for each color variant
  for (const colorVariant of cleaned.colorVariants) {
    const cv = colorVariant as { images?: Array<{ url: string; role: string; order: number }> };
    if (cv.images && cv.images.length > 0) {
      const validationError = validateImageRoles(cv.images);
      if (validationError) {
        return {
          status: 400,
          error: validationError,
        };
      }
    }
  }

  const parsed = createProductSchema.safeParse(cleaned);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) =>
      `${err.path.join(".")}: ${err.message}`
    ).join(", ");

    return {
      status: 400,
      error: "Invalid input",
      details: parsed.error.flatten(),
      messages: errorMessages,
    };
  }

  const data = parsed.data;
  const requiredLocaleCodes = await getRequiredAdminProductLanguageCodes();
  const persistableTranslations = buildPersistableTranslations(
    data.translations,
    requiredLocaleCodes,
    data.title,
    data.description,
  );
  const englishTranslation = persistableTranslations.find((translation) => translation.locale === "en");

  if (!englishTranslation?.title) {
    return {
      status: 400,
      error: "English title is required",
    };
  }

  // Compute unique slug: use provided slug or generate from title
  const baseSlug = generateSlug(data.slug || englishTranslation.title);
  const slug = await makeUniqueSlug(baseSlug, async (candidate) => {
    const existing = await prisma.product.findFirst({ where: { slug: candidate } });
    return !!existing;
  });

  // Get product slug for SKU generation
  const productSlug = slug;

  let createdProductId: string | null = null;

  try {
    // Create product with color variants in a transaction
    const created = await prisma.$transaction(async (tx) => {
      // Create product first to get productId
      const product = await tx.product.create({
        data: {
          name: data.name || englishTranslation.title,
          title: englishTranslation.title,
          slug,
          description: data.description || englishTranslation.description,
          basePrice: data.basePrice,
          price: data.price || data.basePrice,
          stock: data.stock ?? 0,
          visible: data.visible ?? data.isActive ?? true,
          isActive: data.isActive ?? true,
          showInHero: data.showInHero ?? false,
          categoryId: data.categoryId,
          gender: data.gender || null,
          badge: data.badge || null,
          defaultPatchIds: data.defaultPatchIds || [],
        },
      });

      // Track created productId for potential cleanup if transaction fails
      createdProductId = product.id;

      // Commit temp images for all color variants before saving to DB
      // This ensures DB never stores /temp/* URLs
      let totalCommitted = 0;
      const processedColorVariants = await Promise.all(
        data.colorVariants.map(async (colorVariantData) => {
          if (!colorVariantData.images || colorVariantData.images.length === 0) {
            return { ...colorVariantData, committedImages: [] };
          }

          // Count temp images before commit
          const tempCount = colorVariantData.images.filter((img) => img.url.startsWith("/temp/")).length;

          // Commit temp images to product directory
          const committedImages = await commitTempImagesIfNeeded({
            productId: product.id,
            images: colorVariantData.images,
          });

          totalCommitted += tempCount;

          return {
            ...colorVariantData,
            committedImages,
          };
        })
      );

      // DEV-only: Log commit summary
      if (process.env.NODE_ENV === "development" && totalCommitted > 0) {
        console.log(`[product-create] product ${product.id}: committedFiles=${totalCommitted}`);
      }

      // Create color variants with committed images (sortOrder = index)
      for (let i = 0; i < processedColorVariants.length; i++) {
        const variantData = processedColorVariants[i];
        // Get color to access slug for SKU generation
        const color = await tx.color.findUnique({
          where: { id: variantData.colorId },
        });

        if (!color) {
          throw new Error(`Color with ID ${variantData.colorId} not found`);
        }

        // Create color variant with sortOrder = index (0..n-1)
        const colorVariant = await tx.productColorVariant.create({
          data: {
            productId: product.id,
            colorId: variantData.colorId,
            sortOrder: i,
            priceDiff: variantData.priceDiff ?? 0,
            isActive: variantData.isActive ?? true,
          },
        });

        // Create images with committed URLs (never /temp/*)
        if (variantData.committedImages && variantData.committedImages.length > 0) {
          await tx.productImage.createMany({
            data: variantData.committedImages.map((img) => ({
              colorVariantId: colorVariant.id,
              url: img.url, // This is now /uploads/products/{product.id}/... never /temp/*
              role: img.role,
              order: img.order ?? 0,
            })),
          });
        }

        // Create size variants
        if (variantData.sizes && variantData.sizes.length > 0) {
          await tx.productSizeVariant.createMany({
            data: variantData.sizes.map((size) => ({
              colorVariantId: colorVariant.id,
              size: size.size,
              stock: size.stock,
              priceDiff: size.priceDiff ?? 0,
              sku: generateSizeVariantSKU(productSlug, color.slug, size.size),
            })),
          });
        }
      }

      // Create ProductTranslation rows for non-empty allowed locales
      for (const translation of persistableTranslations) {
        await tx.productTranslation.create({
          data: {
            productId: product.id,
            locale: translation.locale,
            title: translation.title,
            description: translation.description,
          },
        });
      }

      // Return product with all relations (colorVariants ordered by sortOrder)
      return await tx.product.findUnique({
        where: { id: product.id },
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
          translations: true,
        } as unknown as Prisma.ProductInclude,
      });
    });

    return { product: created };
  } catch (error) {
    // Best-effort cleanup of product image folder if we created a productId and committed files
    if (createdProductId) {
      try {
        await deleteProductImages(createdProductId);
      } catch (cleanupError) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[product-create] Failed to cleanup images for product ${createdProductId}:`,
            cleanupError
          );
        }
      }
    }

    // Re-throw to preserve existing error handling behavior upstream
    throw error;
  }
}

