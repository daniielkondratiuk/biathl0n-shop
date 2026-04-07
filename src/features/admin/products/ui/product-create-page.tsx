"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateSlug } from "@/lib/utils/slug";
import { ColorVariantData } from "@/features/admin/products/ui/color-variants/color-variant-manager";
import { ProductFormSteps, useProductFormSteps } from "@/features/admin/products/ui/form/product-form-steps";
import { ColorSelectionStep } from "@/features/admin/products/ui/form/color-selection-step";
import { ColorVariantOverview } from "@/features/admin/products/ui/color-variants/color-variant-overview";
import { ColorVariantEditor } from "@/features/admin/products/ui/color-variants/color-variant-editor";
import { PatchCardSelector } from "@/features/admin/products/ui/form/patch-card-selector";
import { useUnsavedChangesGuard } from "@/features/admin/products/ui/use-unsaved-changes-guard";
import { normalizeImageRoles } from "@/lib/utils/image-role-helpers";
import type { Category, Patch, Color } from "../model/types";

type ProductFormLanguage = {
  code: string;
  name: string;
  nativeName: string;
};

type ProductFormTranslation = {
  title: string;
  description: string;
};

type ProductFormTranslations = Record<string, ProductFormTranslation>;

const translatedFieldsSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const translateApiResponseSchema = z.object({
  sourceLocale: z.string(),
  translations: z.record(z.string(), translatedFieldsSchema),
});

const EMPTY_TRANSLATION: ProductFormTranslation = { title: "", description: "" };

const DEFAULT_FORM_LANGUAGES: ProductFormLanguage[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Français" },
];

function createEmptyTranslations(locales: ProductFormLanguage[]): ProductFormTranslations {
  return locales.reduce<ProductFormTranslations>((accumulator, locale) => {
    accumulator[locale.code] = { ...EMPTY_TRANSLATION };
    return accumulator;
  }, {});
}

function getTranslation(
  translations: ProductFormTranslations,
  localeCode: string,
): ProductFormTranslation {
  return translations[localeCode] ?? EMPTY_TRANSLATION;
}

function buildLatestTranslations(
  translations: ProductFormTranslations,
  activeLocale: string,
  title: string,
  description: string,
): ProductFormTranslations {
  return {
    ...translations,
    [activeLocale]: {
      title: title ?? "",
      description: description ?? "",
    },
  };
}

function buildSubmitTranslationsPayload(
  latestTranslations: ProductFormTranslations,
  enabledLanguages: ProductFormLanguage[],
): Record<string, { title: string | null; description: string | null }> {
  const payload: Record<string, { title: string | null; description: string | null }> = {};

  for (const language of enabledLanguages) {
    const translation = getTranslation(latestTranslations, language.code);
    payload[language.code] = {
      title: translation.title.trim() || null,
      description: translation.description.trim() || null,
    };
  }

  return payload;
}

type ProductCreatePageProps = {
  enabledLanguages?: ProductFormLanguage[];
};

export function ProductCreatePage({ enabledLanguages = DEFAULT_FORM_LANGUAGES }: ProductCreatePageProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
  const [autoFillSuccess, setAutoFillSuccess] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [gender, setGender] = useState<string>("");
  const [badge, setBadge] = useState<string>("");
  const [defaultPatchIds, setDefaultPatchIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [showInHero, setShowInHero] = useState(false);
  
  // Translation state
  const [activeLocale, setActiveLocale] = useState<string>("en");
  const [translations, setTranslations] = useState<ProductFormTranslations>(() =>
    createEmptyTranslations(enabledLanguages),
  );
  
  // Step 2: Color selection
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  
  // Step 3: Color variants
  const [colorVariants, setColorVariants] = useState<ColorVariantData[]>([]);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);

  // Multi-step form state
  const { currentStep, goNext, goBack, goToStep } = useProductFormSteps(3, 1);

  // Unsaved changes guard - blocks navigation when dirty and not saving
  const { guardedPush, Modal: UnsavedChangesModal } = useUnsavedChangesGuard({
    dirty: isDirty && !saving,
    enabled: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Use cache: 'no-store' to ensure fresh color data (canonical order from DB)
        const [catRes, patchesRes, colorsRes] = await Promise.all([
          fetch("/api/categories", { cache: 'no-store' }),
          fetch("/api/patches", { cache: 'no-store' }),
          fetch("/api/colors", { cache: 'no-store' }),
        ]);
        const catData = await catRes.json();
        const patchesData = await patchesRes.json();
        const colorsData = await colorsRes.json();
        setCategories(catData.categories || []);
        setPatches((patchesData.patches || []).filter((p: Patch) => p.isActive));
        setColors(colorsData.colors || []);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    setTranslations((previous) => {
      const next = createEmptyTranslations(enabledLanguages);
      for (const locale of enabledLanguages) {
        const previousTranslation = previous[locale.code];
        if (previousTranslation) {
          next[locale.code] = previousTranslation;
        }
      }
      return next;
    });

    const hasActiveLocale = enabledLanguages.some((locale) => locale.code === activeLocale);
    if (!hasActiveLocale) {
      setActiveLocale("en");
      const englishTranslation = getTranslation(translations, "en");
      setTitle(englishTranslation.title);
      setDescription(englishTranslation.description);
    }
  }, [enabledLanguages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate slug from title (only if not manually edited, and only for EN)
  useEffect(() => {
    if (activeLocale === "en" && title && !slugManuallyEdited) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited, activeLocale]);  

  // Sync current input values to translations[activeLocale]
  const syncStep1ToTranslations = (locale: string) => {
    setTranslations(prev => ({
      ...prev,
      [locale]: { title: title ?? "", description: description ?? "" },
    }));
  };

  // Sync title/description with translations when locale changes
  useEffect(() => {
    const activeTranslation = getTranslation(translations, activeLocale);
    setTitle(activeTranslation.title);
    setDescription(activeTranslation.description);
  }, [activeLocale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update translations immediately when title/description changes (for current active locale)
  const handleTitleChange = (value: string) => {
    setTitle(value);
    setTranslations(prev => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], title: value },
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setTranslations(prev => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], description: value },
    }));
  };

  const handleAutoFillMissingTranslations = async () => {
    setAutoFillError(null);
    setAutoFillSuccess(null);

    const latestTranslations = buildLatestTranslations(translations, activeLocale, title, description);
    const englishTranslation = getTranslation(latestTranslations, "en");
    const sourceTitle = englishTranslation.title.trim();
    const sourceDescription = englishTranslation.description.trim();

    if (!sourceTitle && !sourceDescription) {
      return;
    }

    if (!sourceTitle) {
      setAutoFillError("English title is required to auto-fill translations.");
      return;
    }

    const targetLocales = enabledLanguages
      .map((language) => language.code)
      .filter((localeCode) => localeCode !== "en");

    if (targetLocales.length === 0) {
      return;
    }

    setAutoFillLoading(true);

    try {
      const response = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLocale: "en",
          targetLocales,
          fields: {
            title: sourceTitle,
            description: sourceDescription,
          },
        }),
      });

      const responseJson: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof responseJson === "object" &&
          responseJson !== null &&
          "error" in responseJson &&
          typeof responseJson.error === "string"
            ? responseJson.error
            : "Failed to auto-fill translations.";
        setAutoFillError(message);
        return;
      }

      const parsedResponse = translateApiResponseSchema.safeParse(responseJson);
      if (!parsedResponse.success) {
        setAutoFillError("Failed to auto-fill translations.");
        return;
      }

      const nextTranslations: ProductFormTranslations = { ...latestTranslations };
      let hasFilledMissingField = false;

      for (const localeCode of targetLocales) {
        const translated = parsedResponse.data.translations[localeCode];
        if (!translated) {
          continue;
        }

        const current = getTranslation(nextTranslations, localeCode);
        const translatedTitle = translated.title.trim();
        const translatedDescription = translated.description.trim();

        const shouldFillTitle = !current.title.trim() && translatedTitle.length > 0;
        const shouldFillDescription =
          !current.description.trim() && translatedDescription.length > 0;

        if (shouldFillTitle || shouldFillDescription) {
          hasFilledMissingField = true;
          nextTranslations[localeCode] = {
            title: shouldFillTitle ? translatedTitle : current.title,
            description: shouldFillDescription ? translatedDescription : current.description,
          };
        }
      }

      setTranslations(nextTranslations);
      const activeTranslation = getTranslation(nextTranslations, activeLocale);
      setTitle(activeTranslation.title);
      setDescription(activeTranslation.description);
      setAutoFillSuccess(
        hasFilledMissingField
          ? "Missing translations filled."
          : "No missing fields to auto-fill.",
      );
    } catch {
      setAutoFillError("Failed to auto-fill translations.");
    } finally {
      setAutoFillLoading(false);
    }
  };

  // Track dirty state across all form fields
  useEffect(() => {
    const hasChanges = 
      title !== "" ||
      slug !== "" ||
      description !== "" ||
      basePrice !== "" ||
      categoryId !== "" ||
      gender !== "" ||
      badge !== "" ||
      defaultPatchIds.length > 0 ||
      selectedColorIds.length > 0 ||
      colorVariants.length > 0 ||
      showInHero !== false;
    setIsDirty(hasChanges);
  }, [title, slug, description, basePrice, categoryId, gender, badge, defaultPatchIds, selectedColorIds, colorVariants, showInHero]);

  // Handle cancel - uses guarded navigation
  const handleCancel = () => {
    guardedPush("/admin/products");
  };

  // Handle slug manual edit
  const handleSlugChange = (value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  };

  // Normalize slug on blur
  const handleSlugBlur = () => {
    if (slug) {
      const normalized = generateSlug(slug);
      setSlug(normalized);
    }
  };

  // Reset slug to auto-generated
  const handleResetSlug = () => {
    setSlugManuallyEdited(false);
    if (title) {
      setSlug(generateSlug(title));
    }
  };

  // Step 2: Create color variants from selected colors
  const handleColorSelectionContinue = () => {
    // Sync current Step 1 values before navigating
    syncStep1ToTranslations(activeLocale);
    
    // Create placeholder color variants for selected colors
    const newVariants: ColorVariantData[] = selectedColorIds.map((colorId) => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      colorId,
      priceDiff: 0,
      isActive: true,
      images: [],
      sizes: [],
    }));
    setColorVariants(newVariants);
    goNext();
  };

  // Step 3: Handle color variant editing
  const handleEditVariant = (variantId: string) => {
    setEditingVariantId(variantId);
  };

  const handleSaveVariant = (updatedVariant: ColorVariantData) => {
    setColorVariants(prev =>
      prev.map(v => v.id === updatedVariant.id ? updatedVariant : v)
    );
    setEditingVariantId(null);
  };

  const handleRemoveVariant = (variantId: string) => {
    setColorVariants(prev => prev.filter(v => v.id !== variantId));
    setSelectedColorIds(prev => {
      const variant = colorVariants.find(v => v.id === variantId);
      return variant ? prev.filter(id => id !== variant.colorId) : prev;
    });
  };


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Hard guarantee: compute latest translations directly from current inputs
    // This ensures we capture the current active locale's edits, while preserving
    // the other locale's values from the translations state
    const latestTranslations = buildLatestTranslations(translations, activeLocale, title, description);
    const englishTranslation = getTranslation(latestTranslations, "en");
    const translationsPayload = buildSubmitTranslationsPayload(latestTranslations, enabledLanguages);
    
    // Also sync to state for consistency (though we use latestTranslations in payload)
    syncStep1ToTranslations(activeLocale);

    // Validation
    if (!englishTranslation.title || !slug || !basePrice || !categoryId) {
      setError("Please fill in all required fields (EN title is required)");
      setSaving(false);
      return;
    }

    if (colorVariants.length === 0) {
      setError("Please add at least one color variant");
      setSaving(false);
      goToStep(2);
      return;
    }

    // Validate all variants have MAIN image and sizes
    const invalidVariants = colorVariants.filter(
      (cv) =>
        !cv.images.some((img) => img.role === "MAIN") || cv.sizes.length === 0
    );
    if (invalidVariants.length > 0) {
      setError("All color variants must have a MAIN image and at least one size");
      setSaving(false);
      goToStep(3);
      return;
    }

    try {
      // Convert basePrice to cents - handle locale decimal separators
      // Replace comma with dot for European locales, then parse
      const normalizedPrice = basePrice.replace(",", ".");
      const basePriceCents = Math.round(parseFloat(normalizedPrice) * 100);

      const payload = {
        title: englishTranslation.title,
        slug: slug || undefined,
        description: englishTranslation.description || null,
        basePrice: basePriceCents,
        categoryId,
        gender: gender || null,
        badge: badge || null,
        defaultPatchIds,
        isActive,
        showInHero,
        translations: translationsPayload,
        colorVariants: colorVariants.map((cv) => {
          // Normalize images to ensure MAIN exists and roles are correct
          const normalizedImages = normalizeImageRoles(cv.images || []);
          
          return {
            colorId: cv.colorId,
            priceDiff: cv.priceDiff,
            isActive: cv.isActive,
            images: normalizedImages,
            sizes: cv.sizes.map((s) => ({
              size: s.size,
              stock: s.stock,
              priceDiff: s.priceDiff,
            })),
          };
        }),
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json().catch(() => null);

      if (!res.ok) {
        let errorMsg = "Failed to create product";
        if (responseData?.error) {
          errorMsg = responseData.error;
          if (responseData.details) {
            const details = typeof responseData.details === 'string'
              ? responseData.details
              : JSON.stringify(responseData.details);
            errorMsg += `: ${details}`;
          }
        }
        setError(errorMsg);
        setSaving(false);
        return;
      }

      // Reset dirty state and navigate (bypass guard since save succeeded)
      setIsDirty(false);
      router.push("/admin/products");
    } catch {
      setError("An unexpected error occurred");
      setSaving(false);
    }
  }

  const isStep1Valid = getTranslation(translations, "en").title && slug && basePrice && categoryId;
  const isStep3Valid =
    colorVariants.length > 0 &&
    colorVariants.every(
      (cv) =>
        cv.images.some((img) => img.role === "MAIN") && cv.sizes.length > 0
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If editing a variant, show the editor
  if (editingVariantId) {
    const variant = colorVariants.find(v => v.id === editingVariantId);
    if (!variant) {
      setEditingVariantId(null);
      return null;
    }

    return (
      <div className="max-w-4xl">
        <ColorVariantEditor
          variant={variant}
          colors={colors}
          productSlug={slug}
          onSave={handleSaveVariant}
          onCancel={() => setEditingVariantId(null)}
        />
      </div>
    );
  }

  return (
    <>
      <UnsavedChangesModal />
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Create Product</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a new product to your catalog
          </p>
        </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <ProductFormSteps
          totalSteps={3}
          stepLabels={["Basic Info", "Select Colors", "Configure Variants"]}
          currentStep={currentStep}
          goNext={goNext}
          goBack={goBack}
          goToStep={goToStep}
          allowStepJump={false}
          maxReachableStep={currentStep}
          onCancel={handleCancel}
        >
          {(step) => {
            if (step === 1) {
              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Basic Product Information
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Enter the basic details for your product
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                    {/* Locale Tabs */}
                    <div
                      className="flex items-center gap-2 border-b border-border pb-2"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {enabledLanguages.map((locale) => {
                        const localeTranslation = getTranslation(translations, locale.code);
                        const isActive = activeLocale === locale.code;
                        const isEnglish = locale.code === "en";

                        return (
                          <button
                            key={locale.code}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isActive) {
                                syncStep1ToTranslations(activeLocale);
                                setTitle(localeTranslation.title);
                                setDescription(localeTranslation.description);
                                setActiveLocale(locale.code);
                              }
                            }}
                            className={`px-4 py-2 text-sm font-medium transition relative ${
                              isActive
                                ? "text-foreground border-b-2 border-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {locale.name}
                            {!isEnglish && !localeTranslation.title.trim() && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Missing
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {activeLocale !== "en" && getTranslation(translations, "en").title && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const englishTranslation = getTranslation(translations, "en");
                            setTranslations((prev) => ({
                              ...prev,
                              [activeLocale]: {
                                title: englishTranslation.title,
                                description: englishTranslation.description,
                              },
                            }));
                            setTitle(englishTranslation.title);
                            setDescription(englishTranslation.description);
                          }}
                          className="ml-auto h-8 text-xs"
                        >
                          Copy from EN
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAutoFillMissingTranslations}
                          disabled={autoFillLoading}
                        >
                          {autoFillLoading
                            ? "Auto-filling..."
                            : "Auto-fill missing languages"}
                        </Button>
                        {autoFillSuccess ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            {autoFillSuccess}
                          </span>
                        ) : null}
                      </div>
                      {autoFillError ? (
                        <p className="text-xs text-destructive">{autoFillError}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Title {activeLocale === "en" ? "*" : ""}
                      </label>
                      <Input
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        required={activeLocale === "en"}
                        placeholder="e.g. Custom T-Shirt"
                      />
                    </div>

                    {activeLocale === "en" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">Slug *</label>
                          {slugManuallyEdited && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleResetSlug}
                              className="h-7 text-xs"
                            >
                              Reset to automatic
                            </Button>
                          )}
                        </div>
                        <Input
                          value={slug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          onBlur={handleSlugBlur}
                          required
                          placeholder="e.g. custom-t-shirt"
                        />
                        <p className="text-xs text-muted-foreground">
                          URL-friendly identifier (auto-generated from title)
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Description</label>
                      <Textarea
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        placeholder="Product description..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Base Price (EUR) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={basePrice}
                          onChange={(e) => setBasePrice(e.target.value)}
                          required
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Category *</label>
                        <select
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          required
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Gender</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select gender</option>
                          <option value="MEN">Men</option>
                          <option value="WOMEN">Women</option>
                          <option value="KIDS">Kids</option>
                          <option value="UNISEX">Unisex</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Badge</label>
                        <select
                          value={badge}
                          onChange={(e) => setBadge(e.target.value)}
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">No badge</option>
                          <option value="NEW">New</option>
                          <option value="BESTSELLER">Bestseller</option>
                          <option value="SALE">Sale</option>
                          <option value="LIMITED">Limited</option>
                          <option value="BACKINSTOCK">Back in Stock</option>
                          <option value="TRENDING">Trending</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded border-border"
                        />
                        <label htmlFor="isActive" className="text-sm text-foreground">
                          Active (visible in storefront)
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="showInHero"
                          checked={showInHero}
                          onChange={(e) => setShowInHero(e.target.checked)}
                          className="rounded border-border"
                        />
                        <label htmlFor="showInHero" className="text-sm text-foreground">
                          Show in hero banner
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Default Patches
                      </label>
                      <PatchCardSelector
                        patches={patches}
                        value={defaultPatchIds}
                        onChange={setDefaultPatchIds}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="button"
                        onClick={() => {
                          syncStep1ToTranslations(activeLocale);
                          goNext();
                        }}
                        disabled={!isStep1Valid}
                        className="min-w-[120px]"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            if (step === 2) {
              return (
                <ColorSelectionStep
                  colors={colors}
                  selectedColorIds={selectedColorIds}
                  onSelectionChange={setSelectedColorIds}
                  onContinue={handleColorSelectionContinue}
                />
              );
            }

            if (step === 3) {
              return (
                <div className="space-y-6">
                  <ColorVariantOverview
                    colorVariants={colorVariants}
                    colors={colors}
                    onEdit={handleEditVariant}
                    onRemove={handleRemoveVariant}
                    onReorder={setColorVariants}
                  />
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button
                      type="submit"
                      disabled={!isStep3Valid || saving}
                      className="min-w-[120px]"
                    >
                      {saving ? "Creating..." : "Create Product"}
                    </Button>
                  </div>
                </div>
              );
            }

            return null;
          }}
        </ProductFormSteps>
      </form>
      </div>
    </>
  );
}

