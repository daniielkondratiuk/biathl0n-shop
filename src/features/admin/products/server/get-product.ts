import { prisma } from "@/server/db/prisma";
import type { AdminProductTranslationsByLocale } from "../model/types";
import { getRequiredAdminProductLanguageCodes } from "@/server/services/languages";

export async function getAdminProductById(productId: string) {
  const requiredLocaleCodes = await getRequiredAdminProductLanguageCodes();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      translations: {
        where: {
          locale: { in: requiredLocaleCodes },
        },
      },
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
      patches: {
        include: {
          patch: true,
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  const translationsByLocale: AdminProductTranslationsByLocale = {};

  for (const locale of requiredLocaleCodes) {
    translationsByLocale[locale] = {
      title: "",
      description: "",
    };
  }

  for (const translation of product.translations) {
    translationsByLocale[translation.locale] = {
      title: translation.title,
      description: translation.description ?? "",
    };
  }

  return {
    ...product,
    translationsByLocale,
  };
}

