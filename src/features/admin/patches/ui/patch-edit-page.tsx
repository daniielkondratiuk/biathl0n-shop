// src/features/admin/patches/ui/patch-edit-page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Patch {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string;
  price: number;
  isActive: boolean;
}

interface PatchEditPageProps {
  patchId: string;
}

export function PatchEditPage({ patchId }: PatchEditPageProps) {
  const router = useRouter();
  const [patch, setPatch] = useState<Patch | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatch() {
      try {
        const res = await fetch(`/api/patches/${patchId}`);
        if (!res.ok) {
          setError("Patch not found");
          setLoading(false);
          return;
        }
        const data = await res.json();
        const patchData = data.patch;
        setPatch(patchData);
        setName(patchData.name);
        setSlug(patchData.slug);
        setDescription(patchData.description || "");
        setImage(patchData.image);
        setPrice((patchData.price / 100).toFixed(2));
        setIsActive(patchData.isActive);
      } catch {
        setError("Failed to load patch");
      } finally {
        setLoading(false);
      }
    }
    loadPatch();
  }, [patchId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/patches/${patchId}`, {
        method: "PATCH",
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
        setError(data?.error ?? "Failed to update patch.");
        setSaving(false);
        return;
      }

      router.push("/admin/patches");
    } catch {
      setError("Unexpected error. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this patch?")) {
      return;
    }

    try {
      const res = await fetch(`/api/patches/${patchId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setError("Failed to delete patch.");
        return;
      }

      router.push("/admin/patches");
    } catch {
      setError("Unexpected error. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!patch) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Patch Not Found</h1>
        <Button variant="ghost" size="md" onClick={() => router.push("/admin/patches")}>
          Back to Patches
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Patch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update patch details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Name *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Slug *</label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
          />
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
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleDelete}
            className="text-danger hover:text-danger"
          >
            Delete
          </Button>
        </div>
      </form>
    </div>
  );
}

