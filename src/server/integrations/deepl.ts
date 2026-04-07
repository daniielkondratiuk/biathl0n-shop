import "server-only";

import * as deepl from "deepl-node";
import {
  getDeepLTargetLanguage,
  type SupportedLocale,
} from "@/i18n/locales";

export type ProductTranslatableFields = {
  title: string;
  description: string;
};

export type TranslateProductFieldInput = {
  value: string;
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
};

export type TranslateProductTextPayloadInput = {
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  fields: ProductTranslatableFields;
};

export type TranslateProductTextPayloadResult = {
  locale: SupportedLocale;
  fields: ProductTranslatableFields;
};

type DeepLIntegrationErrorCode = "DEEPL_API_KEY_MISSING" | "DEEPL_TRANSLATION_FAILED";

export class DeepLIntegrationError extends Error {
  readonly code: DeepLIntegrationErrorCode;

  constructor(code: DeepLIntegrationErrorCode, message: string) {
    super(message);
    this.name = "DeepLIntegrationError";
    this.code = code;
  }
}

function getTranslator(): deepl.Translator {
  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!apiKey) {
    throw new DeepLIntegrationError(
      "DEEPL_API_KEY_MISSING",
      "DEEPL_API_KEY is missing. Configure it before using translation.",
    );
  }

  return new deepl.Translator(apiKey);
}

export async function translateProductFieldValue(
  input: TranslateProductFieldInput,
): Promise<string> {
  const sourceText = input.value.trim();

  if (!sourceText) {
    return "";
  }

  if (input.sourceLocale === input.targetLocale) {
    return sourceText;
  }

  const translator = getTranslator();
  const sourceLanguage = getDeepLTargetLanguage(input.sourceLocale) as deepl.SourceLanguageCode;
  const targetLanguage = getDeepLTargetLanguage(input.targetLocale) as deepl.TargetLanguageCode;

  try {
    const translationResult = await translator.translateText(
      sourceText,
      sourceLanguage,
      targetLanguage,
    );
    const translatedText = Array.isArray(translationResult)
      ? translationResult[0]?.text ?? ""
      : translationResult.text;

    return translatedText.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DeepL error";
    throw new DeepLIntegrationError(
      "DEEPL_TRANSLATION_FAILED",
      `DeepL translation failed: ${message}`,
    );
  }
}

export async function translateProductTextPayload(
  input: TranslateProductTextPayloadInput,
): Promise<TranslateProductTextPayloadResult> {
  const [title, description] = await Promise.all([
    translateProductFieldValue({
      value: input.fields.title,
      sourceLocale: input.sourceLocale,
      targetLocale: input.targetLocale,
    }),
    translateProductFieldValue({
      value: input.fields.description,
      sourceLocale: input.sourceLocale,
      targetLocale: input.targetLocale,
    }),
  ]);

  return {
    locale: input.targetLocale,
    fields: {
      title,
      description,
    },
  };
}
