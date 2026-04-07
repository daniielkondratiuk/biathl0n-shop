import type { MetadataRoute } from "next";
import { buildSitemap } from "@/features/seo";

const BASE_URL = "https://predators.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await buildSitemap();

  const normalizedEntries = entries.map((entry) => {
    const normalizedUrl = entry.url.replace(/^https?:\/\/[^/]+/, BASE_URL);
    return { ...entry, url: normalizedUrl };
  });

  const requiredLocaleEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/fr`, lastModified: new Date() },
    { url: `${BASE_URL}/en`, lastModified: new Date() },
  ];

  const seen = new Set(normalizedEntries.map((entry) => entry.url));
  for (const localeEntry of requiredLocaleEntries) {
    if (!seen.has(localeEntry.url)) {
      normalizedEntries.push(localeEntry);
      seen.add(localeEntry.url);
    }
  }

  return normalizedEntries;
}
