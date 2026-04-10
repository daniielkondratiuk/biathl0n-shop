// src/features/admin/categories/ui/category-create-page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type LanguageMeta = { code: string; name: string; nativeName: string };

export function CategoryCreatePage() {
  const [name, setName] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [languages, setLanguages] = useState<LanguageMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/languages")
      .then((r) => r.json())
      .then((data) => {
        const langs: LanguageMeta[] = (data.languages || []).filter(
          (l: LanguageMeta & { enabled: boolean }) => l.enabled
        );
        setLanguages(langs);
      })
      .catch(() => {});
  }, []);

  function setTranslationDesc(locale: string, value: string) {
    setTranslations((prev) => ({ ...prev, [locale]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const translationsPayload: Record<string, { description: string | null }> = {};
    for (const [locale, desc] of Object.entries(translations)) {
      if (desc.trim()) {
        translationsPayload[locale] = { description: desc.trim() };
      }
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          nameFr: nameFr.trim() || undefined,
          description: description || undefined,
          ...(Object.keys(translationsPayload).length > 0 && {
            translations: translationsPayload,
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to create category.");
        setSaving(false);
        return;
      }

      window.location.href = "/admin/categories";
    } catch {
      setError("Unexpected error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        New category
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Nom (FR)
          </label>
          <Input
            value={nameFr}
            onChange={(e) => setNameFr(e.target.value)}
            placeholder="Ex: Sweats à capuche"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground dark:text-zinc-300">
            Slug
          </label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground dark:text-zinc-300">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {languages.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Localized descriptions
            </p>
            {languages.map((lang) => (
              <div key={lang.code} className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Description ({lang.nativeName})
                </label>
                <Textarea
                  value={translations[lang.code] || ""}
                  onChange={(e) => setTranslationDesc(lang.code, e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
        <Button
          type="submit"
          disabled={saving}
          size="sm"
        >
          {saving ? "Creating..." : "Create category"}
        </Button>
      </form>
    </div>
  );
}

