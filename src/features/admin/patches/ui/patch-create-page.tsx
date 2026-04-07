// src/features/admin/patches/ui/patch-create-page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PatchCreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-")) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/patches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          description: description || undefined,
          image,
          price: Number(price),
          isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to create patch.");
        setSaving(false);
        return;
      }

      router.push("/admin/patches");
    } catch {
      setError("Unexpected error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Patch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new custom patch for products
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Name *</label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="e.g. Star Patch"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Slug *</label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            placeholder="e.g. star-patch"
          />
          <p className="text-xs text-muted-foreground">
            URL-friendly identifier (auto-generated from name)
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description of the patch"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Image URL *
          </label>
          <Input
            type="url"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            required
            placeholder="https://example.com/patch-image.jpg"
          />
          <p className="text-xs text-muted-foreground">
            Full URL to the patch image
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Price (USD) *
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="5.00"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          <label htmlFor="isActive" className="text-sm text-foreground">
            Active (visible in storefront)
          </label>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" variant="primary" size="md" disabled={saving}>
            {saving ? "Creating..." : "Create Patch"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

