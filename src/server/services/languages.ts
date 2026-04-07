import "server-only";

import type { PrismaClient } from "@prisma/client";
import {
  SUPPORTED_LOCALES,
  getLocaleMeta,
  isSupportedLocale,
  type LocaleMeta,
} from "@/i18n/locales";
import { prisma } from "@/server/db/prisma";

export type LanguageCode = LocaleMeta["code"];

export type LanguageState = LocaleMeta & {
  enabled: boolean;
  isDefault: boolean;
};

export type SaveLanguageConfigurationInput = {
  enabledByCode: Record<LanguageCode, boolean>;
  defaultCode: LanguageCode;
};

export type SaveLanguageConfigurationResult = {
  savedLanguages: LanguageState[];
  enabledCodes: LanguageCode[];
  defaultCode: LanguageCode;
};

type LanguageRow = {
  code: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
};

type SupportedLanguageRow = LanguageRow & {
  code: LanguageCode;
};

const FALLBACK_ENABLED_LANGUAGE_CODES: readonly LanguageCode[] = ["fr", "en"];
const FALLBACK_DEFAULT_LANGUAGE_CODE: LanguageCode = "fr";

const fallbackEnabledLanguageCodeSet = new Set<LanguageCode>(FALLBACK_ENABLED_LANGUAGE_CODES);
const languageModel = (
  prisma as PrismaClient & {
    language: {
      findMany(args?: {
        select?: {
          code?: boolean;
          enabled?: boolean;
          isDefault?: boolean;
          sortOrder?: boolean;
        };
      }): Promise<LanguageRow[]>;
      upsert(args: {
        where: { code: string };
        create: {
          code: string;
          name: string;
          nativeName: string;
          enabled: boolean;
          isDefault: boolean;
          sortOrder: number;
        };
        update: {
          name: string;
          nativeName: string;
          enabled: boolean;
          isDefault: boolean;
          sortOrder: number;
        };
      }): Promise<unknown>;
    };
  }
).language;

function compareBySortOrderThenCode(
  a: Pick<LanguageRow, "sortOrder" | "code">,
  b: Pick<LanguageRow, "sortOrder" | "code">,
): number {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.code.localeCompare(b.code);
}

function getFallbackState(code: LanguageCode): Pick<LanguageState, "enabled" | "isDefault"> {
  return {
    enabled: fallbackEnabledLanguageCodeSet.has(code),
    isDefault: code === FALLBACK_DEFAULT_LANGUAGE_CODE,
  };
}

function isSupportedLanguageRow(row: LanguageRow): row is SupportedLanguageRow {
  return isSupportedLocale(row.code);
}

async function loadLanguageRows(): Promise<LanguageRow[]> {
  try {
    return await languageModel.findMany({
      select: {
        code: true,
        enabled: true,
        isDefault: true,
        sortOrder: true,
      },
    });
  } catch {
    return [];
  }
}

function mapCodeToLanguageState(
  code: LanguageCode,
  row?: Pick<LanguageRow, "enabled" | "isDefault">,
): LanguageState {
  const meta = getLocaleMeta(code);
  const fallbackState = getFallbackState(code);

  return {
    ...meta,
    enabled: row?.enabled ?? fallbackState.enabled,
    isDefault: row?.isDefault ?? fallbackState.isDefault,
  };
}

export async function getAllSupportedLanguages(): Promise<LanguageState[]> {
  const rows = await loadLanguageRows();
  const rowByCode = new Map<LanguageCode, Pick<LanguageRow, "enabled" | "isDefault">>();

  for (const row of rows) {
    if (!isSupportedLocale(row.code)) {
      continue;
    }

    rowByCode.set(row.code, {
      enabled: row.enabled,
      isDefault: row.isDefault,
    });
  }

  return SUPPORTED_LOCALES.map((code) => mapCodeToLanguageState(code, rowByCode.get(code)));
}

export async function getEnabledLanguageCodes(): Promise<LanguageCode[]> {
  const rows = await loadLanguageRows();

  if (rows.length === 0) {
    return [...FALLBACK_ENABLED_LANGUAGE_CODES];
  }

  const enabledCodes = rows
    .filter((row) => row.enabled)
    .filter(isSupportedLanguageRow)
    .sort(compareBySortOrderThenCode)
    .map((row) => row.code);

  return enabledCodes.length > 0 ? enabledCodes : [...FALLBACK_ENABLED_LANGUAGE_CODES];
}

export async function getEnabledLanguages(): Promise<LocaleMeta[]> {
  const enabledLanguageCodes = await getEnabledLanguageCodes();
  return enabledLanguageCodes.map((code) => getLocaleMeta(code));
}

export async function getEnabledLanguagesForAdminProductForms(): Promise<LocaleMeta[]> {
  const enabledLanguages = await getEnabledLanguages();
  const languagesForForms: LocaleMeta[] = [getLocaleMeta("en")];
  const seenCodes = new Set<LanguageCode>(["en"]);

  for (const language of enabledLanguages) {
    if (seenCodes.has(language.code)) {
      continue;
    }

    languagesForForms.push(language);
    seenCodes.add(language.code);
  }

  return languagesForForms;
}

export async function getEnabledLanguagesForStorefront(): Promise<LocaleMeta[]> {
  return getEnabledLanguages();
}

export async function getRequiredAdminProductLanguageCodes(): Promise<LanguageCode[]> {
  const languagesForForms = await getEnabledLanguagesForAdminProductForms();
  return languagesForForms.map((language) => language.code);
}

export async function getAutoTranslatableAdminProductLanguageCodes(): Promise<LanguageCode[]> {
  const languagesForForms = await getEnabledLanguagesForAdminProductForms();
  return languagesForForms.map((language) => language.code);
}

export async function getDefaultLanguageCode(): Promise<LanguageCode> {
  const rows = await loadLanguageRows();

  const defaultRows = rows
    .filter((row) => row.isDefault)
    .filter(isSupportedLanguageRow)
    .sort(compareBySortOrderThenCode);

  return defaultRows[0]?.code ?? FALLBACK_DEFAULT_LANGUAGE_CODE;
}

export async function isEnabledLanguage(code: string): Promise<boolean> {
  if (!isSupportedLocale(code)) {
    return false;
  }

  const enabledLanguageCodes = await getEnabledLanguageCodes();
  return enabledLanguageCodes.includes(code);
}

export async function saveLanguageConfiguration(
  input: SaveLanguageConfigurationInput,
): Promise<SaveLanguageConfigurationResult> {
  const normalizedEnabledByCode: Record<LanguageCode, boolean> = SUPPORTED_LOCALES.reduce(
    (accumulator, code) => {
      accumulator[code] = Boolean(input.enabledByCode[code]);
      return accumulator;
    },
    {} as Record<LanguageCode, boolean>,
  );

  const areAllDisabled = SUPPORTED_LOCALES.every((code) => !normalizedEnabledByCode[code]);
  if (areAllDisabled) {
    normalizedEnabledByCode[FALLBACK_DEFAULT_LANGUAGE_CODE] = true;
  }

  if (!normalizedEnabledByCode[input.defaultCode]) {
    normalizedEnabledByCode[input.defaultCode] = true;
  }

  for (const [index, code] of SUPPORTED_LOCALES.entries()) {
    const meta = getLocaleMeta(code);
    const enabled = normalizedEnabledByCode[code];
    const isDefault = code === input.defaultCode;

    await languageModel.upsert({
      where: { code },
      create: {
        code,
        name: meta.name,
        nativeName: meta.nativeName,
        enabled,
        isDefault,
        sortOrder: index,
      },
      update: {
        name: meta.name,
        nativeName: meta.nativeName,
        enabled,
        isDefault,
        sortOrder: index,
      },
    });
  }

  const savedLanguages = SUPPORTED_LOCALES.map((code) =>
    mapCodeToLanguageState(code, {
      enabled: normalizedEnabledByCode[code],
      isDefault: code === input.defaultCode,
    }),
  );

  const enabledCodes = SUPPORTED_LOCALES.filter((code) => normalizedEnabledByCode[code]);

  return {
    savedLanguages,
    enabledCodes,
    defaultCode: input.defaultCode,
  };
}
