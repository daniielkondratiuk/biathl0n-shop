import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/server/auth/auth";
import {
  DeepLIntegrationError,
  translateProductTextPayload,
  type ProductTranslatableFields,
} from "@/server/integrations/deepl";
import { isSupportedLocale, type SupportedLocale } from "@/i18n/locales";

const localeSchema = z
  .string()
  .refine(isSupportedLocale, { message: "Locale must be one of the supported locales." });

const translateRequestSchema = z.object({
  sourceLocale: localeSchema,
  targetLocales: z.array(localeSchema),
  fields: z.object({
    title: z.string().default(""),
    description: z.string().default(""),
  }),
});

type TranslateAdminRequest = z.infer<typeof translateRequestSchema>;

type TranslateAdminResponse = {
  sourceLocale: SupportedLocale;
  translations: Partial<Record<SupportedLocale, ProductTranslatableFields>>;
};

function normalizeTargetLocales(input: TranslateAdminRequest): SupportedLocale[] {
  const uniqueTargets = new Set<SupportedLocale>();

  for (const targetLocale of input.targetLocales) {
    if (!isSupportedLocale(targetLocale) || targetLocale === input.sourceLocale) {
      continue;
    }

    uniqueTargets.add(targetLocale);
  }

  return [...uniqueTargets];
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = translateRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const targetLocales = normalizeTargetLocales(parsed.data);

    if (targetLocales.length === 0) {
      const response: TranslateAdminResponse = {
        sourceLocale: parsed.data.sourceLocale,
        translations: {},
      };

      return NextResponse.json(response, { status: 200 });
    }

    const translationResults = await Promise.all(
      targetLocales.map((targetLocale) =>
        translateProductTextPayload({
          sourceLocale: parsed.data.sourceLocale,
          targetLocale,
          fields: {
            title: parsed.data.fields.title,
            description: parsed.data.fields.description,
          },
        }),
      ),
    );

    const translations: Partial<Record<SupportedLocale, ProductTranslatableFields>> = {};
    for (const result of translationResults) {
      translations[result.locale] = result.fields;
    }

    const response: TranslateAdminResponse = {
      sourceLocale: parsed.data.sourceLocale,
      translations,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof DeepLIntegrationError) {
      const status = error.code === "DEEPL_API_KEY_MISSING" ? 500 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }

    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
