// src/features/admin/company/ui/company-form.tsx
"use client";

import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CompanyProfile {
  id: string;
  legalName: string;
  brandName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  siren: string | null;
  siret: string | null;
  vatId: string | null;
  vatNote: string | null;
  currency: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  paymentTerms: string | null;
  legalFooter: string | null;
  logoUrl: string | null;
}

interface CompanyFormProps {
  initialProfile: CompanyProfile | null;
}

function buildFormData(profile: CompanyProfile | null) {
  return {
    legalName: profile?.legalName || "",
    brandName: profile?.brandName || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    addressLine1: profile?.addressLine1 || "",
    addressLine2: profile?.addressLine2 || "",
    postalCode: profile?.postalCode || "",
    city: profile?.city || "",
    country: profile?.country || "",
    siren: profile?.siren || "",
    siret: profile?.siret || "",
    vatId: profile?.vatId || "",
    vatNote: profile?.vatNote || "",
    currency: profile?.currency || "EUR",
    invoicePrefix: profile?.invoicePrefix || "INV",
    invoiceNextNumber: profile?.invoiceNextNumber || 1,
    paymentTerms: profile?.paymentTerms || "",
    legalFooter: profile?.legalFooter || "",
    logoUrl: profile?.logoUrl || "",
  };
}

export function CompanyForm({ initialProfile }: CompanyFormProps) {
  const [formData, setFormData] = useState(() => buildFormData(initialProfile));
  const [trackedProfileId, setTrackedProfileId] = useState(initialProfile?.id ?? null);

  // Render guard: re-sync form when profile identity changes (self-terminating)
  if ((initialProfile?.id ?? null) !== trackedProfileId) {
    setTrackedProfileId(initialProfile?.id ?? null);
    setFormData(buildFormData(initialProfile));
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      // Prepare payload - convert empty strings to null for optional fields
      const payload = {
        ...formData,
        addressLine2: formData.addressLine2 || null,
        siren: formData.siren || null,
        siret: formData.siret || null,
        vatId: formData.vatId || null,
        vatNote: formData.vatNote || null,
        paymentTerms: formData.paymentTerms || null,
        legalFooter: formData.legalFooter || null,
        logoUrl: formData.logoUrl || null,
        invoiceNextNumber: Number(formData.invoiceNextNumber),
      };

      const res = await fetch("/api/admin/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Failed to save company profile");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setSaving(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Unexpected error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Identity</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Legal Name *
            </label>
            <Input
              value={formData.legalName}
              onChange={(e) =>
                setFormData({ ...formData, legalName: e.target.value })
              }
              required
              placeholder="e.g. predators SARL"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Brand Name *
            </label>
            <Input
              value={formData.brandName}
              onChange={(e) =>
                setFormData({ ...formData, brandName: e.target.value })
              }
              required
              placeholder="e.g. predators Shop"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Logo URL
            </label>
            <Input
              type="url"
              value={formData.logoUrl}
              onChange={(e) =>
                setFormData({ ...formData, logoUrl: e.target.value })
              }
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>
      </Card>

      {/* Contact Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Contact</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              placeholder="contact@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Phone *</label>
            <Input
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
              placeholder="+33 1 23 45 67 89"
            />
          </div>
        </div>
      </Card>

      {/* Address Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Address</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Address Line 1 *
            </label>
            <Input
              value={formData.addressLine1}
              onChange={(e) =>
                setFormData({ ...formData, addressLine1: e.target.value })
              }
              required
              placeholder="123 Main Street"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Address Line 2
            </label>
            <Input
              value={formData.addressLine2}
              onChange={(e) =>
                setFormData({ ...formData, addressLine2: e.target.value })
              }
              placeholder="Apartment, suite, etc."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Postal Code *
              </label>
              <Input
                value={formData.postalCode}
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
                required
                placeholder="75001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">City *</label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                required
                placeholder="Paris"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Country *
            </label>
            <Input
              value={formData.country}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
              required
              placeholder="France"
            />
          </div>
        </div>
      </Card>

      {/* Legal/Tax Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Legal / Tax Information
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">SIREN</label>
            <Input
              value={formData.siren}
              onChange={(e) =>
                setFormData({ ...formData, siren: e.target.value })
              }
              placeholder="123 456 789"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">SIRET</label>
            <Input
              value={formData.siret}
              onChange={(e) =>
                setFormData({ ...formData, siret: e.target.value })
              }
              placeholder="123 456 789 00012"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">VAT ID</label>
            <Input
              value={formData.vatId}
              onChange={(e) =>
                setFormData({ ...formData, vatId: e.target.value })
              }
              placeholder="FR12345678901"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              VAT Note
            </label>
            <Textarea
              value={formData.vatNote}
              onChange={(e) =>
                setFormData({ ...formData, vatNote: e.target.value })
              }
              rows={2}
              placeholder='e.g. "TVA non applicable, art. 293 B du CGI"'
            />
          </div>
        </div>
      </Card>

      {/* Invoice Settings Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Invoice Settings
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Currency *
              </label>
              <Input
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                required
                placeholder="EUR"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Invoice Prefix *
              </label>
              <Input
                value={formData.invoicePrefix}
                onChange={(e) =>
                  setFormData({ ...formData, invoicePrefix: e.target.value })
                }
                required
                placeholder="INV"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Next Number *
              </label>
              <Input
                type="number"
                min="1"
                value={formData.invoiceNextNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    invoiceNextNumber: parseInt(e.target.value) || 1,
                  })
                }
                required
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Terms/Footer Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Terms & Legal Footer
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Payment Terms
            </label>
            <Input
              value={formData.paymentTerms}
              onChange={(e) =>
                setFormData({ ...formData, paymentTerms: e.target.value })
              }
              placeholder="e.g. Net 30 days"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Legal Footer
            </label>
            <Textarea
              value={formData.legalFooter}
              onChange={(e) =>
                setFormData({ ...formData, legalFooter: e.target.value })
              }
              rows={4}
              placeholder="Legal mentions, penalties, etc."
            />
          </div>
        </div>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Company profile saved successfully!
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Company Profile"}
        </Button>
      </div>
    </form>
  );
}

