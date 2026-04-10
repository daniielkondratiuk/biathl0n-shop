// src/features/admin/categories/ui/category-edit-page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type LanguageMeta = { code: string; name: string; nativeName: string };
type CategoryTranslationRow = { locale: string; description?: string | null };

interface CategoryEditPageProps {
  categoryId: string;
}

export function CategoryEditPage({ categoryId }: CategoryEditPageProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [languages, setLanguages] = useState<LanguageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, langRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/admin/languages"),
        ]);
        const catData = await catRes.json();
        const langData = await langRes.json();

        const langs: LanguageMeta[] = (langData.languages || []).filter(
          (l: LanguageMeta & { enabled: boolean }) => l.enabled
        );
        setLanguages(langs);

        const cat = (catData.categories as Array<{
          id: string;
          name: string;
          nameFr?: string | null;
          slug: string;
          description?: string | null;
          translations?: CategoryTranslationRow[];
        }>).find((c) => c.id === categoryId);

        if (!cat) {
          setError("Category not found.");
        } else {
          setName(cat.name);
          setNameFr(cat.nameFr ?? "");
          setSlug(cat.slug);
          setDescription(cat.description ?? "");

          const existingTranslations: Record<string, string> = {};
          for (const t of cat.translations || []) {
            if (t.description) {
              existingTranslations[t.locale] = t.description;
            }
          }
          setTranslations(existingTranslations);
        }
      } catch {
        setError("Failed to load category.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [categoryId]);

  function setTranslationDesc(locale: string, value: string) {
    setTranslations((prev) => ({ ...prev, [locale]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const translationsPayload: Record<string, { description: string | null }> = {};
    for (const lang of languages) {
      const desc = translations[lang.code]?.trim() || null;
      translationsPayload[lang.code] = { description: desc };
    }

    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nameFr: nameFr.trim() || undefined,
          slug,
          description: description || undefined,
          translations: translationsPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to update category.");
        setSaving(false);
        return;
      }

      router.push("/admin/categories");
    } catch {
      setError("Unexpected error. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading...</p>
    );
  }

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        Edit category
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
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

