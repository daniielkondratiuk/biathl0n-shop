// src/features/account/ui/addresses-page-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { AddressForm } from "./address-form";
import {
  validateAddressForm,
  type AddressFormValue,
} from "@/lib/utils/address-validation";
import { useTranslations } from "next-intl";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  createdAt: Date;
}

interface AddressesPageClientProps {
  initialAddresses: Address[];
}

export function AddressesPageClient({ initialAddresses }: AddressesPageClientProps) {
  const t = useTranslations("account.addresses");
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Sync addresses when props change (after router.refresh())
  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  const [formData, setFormData] = useState<AddressFormValue>({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [isPrimary, setIsPrimary] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressFormValue, string>>>({});
  const isPending = loading;

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      postalCode: "",
      country: "",
    });
    setIsPrimary(false);
    setFormErrors({});
    setShowForm(false);
    setError(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validateAddressForm(formData);
    setFormErrors(err);
    if (Object.keys(err).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          line1: formData.line1,
          line2: formData.line2.trim() || null,
          city: formData.city,
          state: null,
          postalCode: formData.postalCode,
          country: formData.country,
          isPrimary,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create address");
      }

      router.refresh();
      resetForm();
      showToast(t("addressAdded"), "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failedToAdd"));
      showToast(t("failedToAdd"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPrimary(addressId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/addresses/${addressId}/primary`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to set primary address");
      }

      router.refresh();
      showToast(t("primaryUpdated"), "success");
    } catch {
      showToast(t("failedToUpdatePrimary"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!confirm(t("confirmDelete"))) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete address");
      }

      router.refresh();
      showToast(t("addressDeleted"), "success");
    } catch {
      showToast(t("failedToDelete"), "error");
    } finally {
      setLoading(false);
    }
  }

  function formatAddress(address: Address): string {
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);
    return parts.join(", ");
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-lg ${
            toast.type === "success"
              ? "border-green-200 dark:border-green-800"
              : "border-red-200 dark:border-red-800"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <p className="text-sm font-medium text-foreground">{toast.message}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setToast(null)}
            className="h-6 w-6 rounded-full p-0 hover:bg-muted"
          >
            ×
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{t("title")}</h2>
        {!showForm && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            {t("addAddress")}
          </Button>
        )}
      </div>

      <div className={isPending ? "space-y-6 opacity-70 pointer-events-none" : "space-y-6"}>
        {showForm && (
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">{t("addNewAddress")}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AddressForm
                idPrefix="dashboard-address"
                value={formData}
                onChange={setFormData}
                errors={formErrors}
                disabled={loading}
                showPrimaryCheckbox
                isPrimary={isPrimary}
                onPrimaryChange={setIsPrimary}
              />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  variant="primary"
                  className="cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? t("adding") : t("addAddress")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  disabled={loading}
                  className="cursor-pointer disabled:cursor-not-allowed"
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!loading && addresses.length === 0 && !showForm ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">{t("noAddresses")}</p>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowForm(true)}
              className="cursor-pointer disabled:cursor-not-allowed"
              disabled={loading}
            >
              {t("addFirstAddress")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <Card key={address.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-foreground">{address.fullName}</p>
                      {address.isPrimary && (
                        <Badge variant="default" size="sm">
                          {t("primary")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{formatAddress(address)}</p>
                    <p className="text-sm text-muted-foreground">{t("phone", { phone: address.phone })}</p>
                  </div>
                  <div className="flex gap-2">
                    {!address.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(address.id)}
                        disabled={loading}
                        className="cursor-pointer disabled:cursor-not-allowed"
                      >
                        {t("setAsPrimary")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                      disabled={loading}
                      className="cursor-pointer text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

