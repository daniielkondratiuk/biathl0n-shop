import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCompanyProfile } from "@/features/admin/company";
import { ThemeAwareMapIframe } from "./theme-aware-map-iframe";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: `${t("title")} | predators`,
      description: t("description"),
    },
  };
}

function formatAddress(profile: Awaited<ReturnType<typeof getCompanyProfile>>) {
  if (!profile) return null;

  const parts = [
    profile.addressLine1,
    profile.addressLine2 || undefined,
    `${profile.postalCode} ${profile.city}`.trim(),
    profile.country,
  ].filter(Boolean);

  return parts.join(", ");
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const profile = await getCompanyProfile();
  const formattedAddress = formatAddress(profile);
  const encodedAddress = formattedAddress
    ? encodeURIComponent(formattedAddress)
    : encodeURIComponent("Paris, France");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h2 className="text-lg font-medium text-foreground">{t("companyDetails")}</h2>
            {profile ? (
              <div className="mt-3 space-y-1">
                <p className="font-medium text-foreground">
                  {profile.brandName || profile.legalName}
                </p>
                <p>{profile.legalName}</p>
                {formattedAddress && <p>{formattedAddress}</p>}
              </div>
            ) : (
              <p className="mt-3 text-xs">
                {t("companyNotConfigured")}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium text-foreground">{t("contact")}</h2>
            <div className="mt-3 space-y-1">
              <p>
                <span className="font-medium text-foreground">{t("email")}&nbsp;</span>
                {profile?.email ? (
                  <a
                    href={`mailto:${profile.email}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {profile.email}
                  </a>
                ) : (
                  <span>{t("notConfigured")}</span>
                )}
              </p>
              <p>
                <span className="font-medium text-foreground">{t("phone")}&nbsp;</span>
                {profile?.phone ?? t("notConfigured")}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-foreground">{t("businessHours")}</h2>
            <p className="mt-3">
              {t("businessHoursText")}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium text-foreground">{t("reasonsToContact")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>{t("reasonOrder")}</li>
              <li>{t("reasonSizing")}</li>
              <li>{t("reasonIssues")}</li>
              <li>{t("reasonWholesale")}</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("location")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("locationDescription")}
          </p>
          <div className="mt-4 overflow-hidden rounded-md border border-border/60 bg-background/40">
            <ThemeAwareMapIframe encodedAddress={encodedAddress} />
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {t("getDirections")}
          </a>
        </section>
      </div>
    </div>
  );
}

