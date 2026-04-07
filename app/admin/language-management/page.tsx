import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type SupportedLocale,
} from "@/i18n/locales";
import {
  getAllSupportedLanguages,
  saveLanguageConfiguration,
  type LanguageCode,
} from "@/server/services/languages";

const FALLBACK_DEFAULT_LANGUAGE_CODE: SupportedLocale = "fr";

async function saveLanguageConfigurationAction(formData: FormData): Promise<void> {
  "use server";

  const enabledByCode = {} as Record<LanguageCode, boolean>;

  for (const code of SUPPORTED_LOCALES) {
    enabledByCode[code] = formData.get(`enabled-${code}`) === "on";
  }

  const submittedDefaultCode = formData.get("defaultCode");
  const defaultCode =
    typeof submittedDefaultCode === "string" && isSupportedLocale(submittedDefaultCode)
      ? submittedDefaultCode
      : FALLBACK_DEFAULT_LANGUAGE_CODE;

  await saveLanguageConfiguration({
    enabledByCode,
    defaultCode,
  });

  revalidatePath("/admin/language-management");
  redirect("/admin/language-management?saved=1");
}

type AdminLanguageManagementPageProps = {
  searchParams?: Promise<{ saved?: string }>;
};

export default async function AdminLanguageManagementPage({
  searchParams,
}: AdminLanguageManagementPageProps) {
  const languages = await getAllSupportedLanguages();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showSavedMessage = resolvedSearchParams?.saved === "1";
  const currentDefaultCode =
    languages.find((language) => language.isDefault)?.code ?? FALLBACK_DEFAULT_LANGUAGE_CODE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Language Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enable storefront languages and choose the default locale.
        </p>
      </div>

      {showSavedMessage ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          Language settings saved.
        </div>
      ) : null}

      <form action={saveLanguageConfigurationAction} className="space-y-4">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Language</th>
                <th className="px-4 py-3 text-left font-medium">Native name</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Enabled</th>
                <th className="px-4 py-3 text-left font-medium">Default</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((language) => (
                <tr key={language.code} className="border-t border-border">
                  <td className="px-4 py-3">{language.name}</td>
                  <td className="px-4 py-3">{language.nativeName}</td>
                  <td className="px-4 py-3 uppercase">{language.code}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      name={`enabled-${language.code}`}
                      defaultChecked={language.enabled}
                      aria-label={`Enable ${language.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="defaultCode"
                        value={language.code}
                        defaultChecked={language.code === currentDefaultCode}
                        aria-label={`Set ${language.name} as default`}
                      />
                      {language.code === currentDefaultCode ? (
                        <span className="text-xs text-muted-foreground">Current default</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Save languages
        </button>
      </form>
    </div>
  );
}
