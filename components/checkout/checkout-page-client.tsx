// components/checkout/checkout-page-client.tsx
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ColissimoPointRelaisSelector } from "@/components/checkout/colissimo-point-relais-selector";
import { useCartStore } from "@/features/cart/model/cart.store";
import {
  fetchColissimoRelayPoints,
  type PickupPoint,
  type ShippingCarrierId,
  type DeliveryMode,
  type ShippingSpeed,
  type ColissimoRelayPointResponse,
  type ShippingSnapshot,
} from "@/features/checkout/shared/checkout-shipping";
import { AddressForm } from "@/features/account/ui/address-form";
import { CustomDropdown, type DropdownOption } from "@/shared/ui/custom-dropdown";
import {
  validateAddressForm,
  isAddressFormValid,
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
}

interface CheckoutPageClientProps {
  customerProfile: {
    name: string | null;
    email: string;
    phone: string | null;
    primaryAddress: Address | null;
    addresses: Address[];
  } | null;
}

type ColissimoPoint = ColissimoRelayPointResponse["points"][number];

function normalizeSegment(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function buildAddressKey(address: {
  line1: string;
  postalCode: string;
  city: string;
  country: string;
}): string {
  return [
    normalizeSegment(address.line1),
    normalizeSegment(address.postalCode),
    normalizeSegment(address.city),
    normalizeSegment(address.country || "FR"),
  ].join("|");
}

// Carrier metadata
const CARRIER_META: Record<string, { label: string; logoSrc?: string }> = {
  colissimo: {
    label: "Colissimo",
  },
};

// Colissimo hybrid pricing: flat TTC for FR, weight-based HT for DOM/INT
const FREE_SHIPPING_THRESHOLD_CENTS = 10000; // €100.00
const FR_STANDARD_HOME = 790; // €7.90 TTC
const FR_STANDARD_PICKUP = 690; // €6.90 TTC
const FR_EXPRESS_HOME = 1190; // €11.90 TTC
const FR_EXPRESS_PICKUP = 1090; // €10.90 TTC
const FR_EXPRESS_UPGRADE_HOME = 400; // +€4.00 upgrade when standard is free
const FR_EXPRESS_UPGRADE_PICKUP = 300; // +€3.00 upgrade when standard is free
const TVA_RATE = 0.20;
const FALLBACK_WEIGHT_GRAMS = 250;
const DOM_CODES = ["GP", "MQ", "GF", "RE", "YT"];
const EXPRESS_SURCHARGE_PCT = 0.25;
const EXPRESS_SURCHARGE_MIN_CENTS = 400; // +€4.00 minimum
const EXPRESS_SURCHARGE_MAX_CENTS = 1000; // +€10.00 cap
const NON_FR_PICKUP_DISCOUNT = 100; // -€1.00
const NON_FR_PICKUP_FLOOR = 400; // €4.00 minimum

const HOME_FR: { max: number; price: number }[] = [
  { max: 250, price: 684 }, { max: 500, price: 771 }, { max: 750, price: 860 },
  { max: 1000, price: 934 }, { max: 2000, price: 1048 }, { max: 3000, price: 1149 },
  { max: 5000, price: 1328 }, { max: 7000, price: 1499 }, { max: 10000, price: 1718 },
  { max: 15000, price: 2033 }, { max: 20000, price: 2350 }, { max: 30000, price: 3705 },
];

const PICKUP_FR: { max: number; price: number }[] = [
  { max: 250, price: 520 }, { max: 500, price: 606 }, { max: 750, price: 697 },
  { max: 1000, price: 771 }, { max: 2000, price: 884 }, { max: 3000, price: 985 },
  { max: 5000, price: 1183 }, { max: 7000, price: 1344 }, { max: 10000, price: 1559 },
  { max: 15000, price: 1876 }, { max: 20000, price: 2192 }, { max: 29000, price: 3447 },
];

function roundToQuarterEuro(cents: number): number {
  return Math.round((Math.round((cents / 100) * 4) / 4) * 100);
}

function computeColissimoShipping(
  weightGrams: number,
  deliveryMode: DeliveryMode | null,
  speed: ShippingSpeed | null,
  countryCode: string,
  subtotalCents: number,
): number | null {
  if (!deliveryMode || !speed) return null;
  const cc = (countryCode || "FR").toUpperCase();

  // France Metropolitan: flat TTC prices, free only for standard
  if (cc === "FR") {
    if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
      if (speed === "standard") return 0;
      return deliveryMode === "pickup" ? FR_EXPRESS_UPGRADE_PICKUP : FR_EXPRESS_UPGRADE_HOME;
    }
    if (speed === "express") {
      return deliveryMode === "pickup" ? FR_EXPRESS_PICKUP : FR_EXPRESS_HOME;
    }
    return deliveryMode === "pickup" ? FR_STANDARD_PICKUP : FR_STANDARD_HOME;
  }

  // DOM / International: weight-based HT + multiplier + TVA + rounding (no free shipping)
  const tiers = deliveryMode === "pickup" ? PICKUP_FR : HOME_FR;
  const baseHT = tiers.find((t) => weightGrams <= t.max)?.price ?? tiers[tiers.length - 1].price;
  let adjusted = baseHT;
  if (DOM_CODES.includes(cc)) adjusted = Math.round(baseHT * 1.6);
  else adjusted = Math.round(baseHT * 2.2);
  let standardTtc = Math.round(adjusted * (1 + TVA_RATE));

  if (deliveryMode === "pickup") {
    standardTtc = Math.max(NON_FR_PICKUP_FLOOR, standardTtc - NON_FR_PICKUP_DISCOUNT);
  }

  if (speed === "express") {
    const pct = Math.floor(standardTtc * EXPRESS_SURCHARGE_PCT);
    const surcharge = Math.min(EXPRESS_SURCHARGE_MAX_CENTS, Math.max(EXPRESS_SURCHARGE_MIN_CENTS, pct));
    return roundToQuarterEuro(standardTtc + surcharge);
  }
  return roundToQuarterEuro(standardTtc);
}

export function CheckoutPageClient({ customerProfile }: CheckoutPageClientProps) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const resolvedItems = useCartStore((state) => state.resolvedItems);

  // Step state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Address state (AddressFormValue; country = ISO code)
  const [formData, setFormData] = useState<AddressFormValue>({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Shipping state
  const [carrierId, setCarrierId] = useState<ShippingCarrierId | null>(null);
  const [shippingProvider, setShippingProvider] = useState<
    "colissimo" | null
  >(null);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | null>(null);
  const [speed, setSpeed] = useState<ShippingSpeed | null>(null);
  const [selectedColissimoPoint, setSelectedColissimoPoint] =
    useState<ColissimoPoint | null>(null);
  const [colissimoPreferredMode, setColissimoPreferredMode] =
    useState<DeliveryMode | null>(null);
  const [colissimoPoints, setColissimoPoints] = useState<ColissimoPoint[] | null>(null);
  const [colissimoLoading, setColissimoLoading] = useState(false);
  const [colissimoError, setColissimoError] = useState<string | null>(null);
  const [colissimoLastKey, setColissimoLastKey] = useState<string | null>(null);

  // Quote state
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteCacheKey, setQuoteCacheKey] = useState<string | null>(null);

  // Other state
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Address validation: saved address OK, else validate full form
  const formErrors = !selectedAddressId ? validateAddressForm(formData) : {};
  const isStep1Complete = selectedAddressId ? true : isAddressFormValid(formData);

  // Get current address for quote (from saved or form)
  const getCurrentAddress = () => {
    return {
      line1: formData.line1,
      country: formData.country || "FR",
      postalCode: formData.postalCode,
      city: formData.city,
    };
  };

  // Shipping step validation
  const isPickupComplete =
    shippingProvider === "colissimo" &&
    deliveryMode === "pickup" &&
    !!selectedColissimoPoint;

  const isStep2Complete = Boolean(
    carrierId &&
      shippingProvider &&
      deliveryMode &&
      speed &&
      (deliveryMode === "home" || isPickupComplete)
  );

  // Invalidate quote and address-dependent shipping state when address changes
  const invalidateQuote = () => {
    setQuoteStatus("idle");
    setQuoteCacheKey(null);
    setQuoteError(null);
    setDeliveryMode("home");
  };

  useEffect(() => {
    invalidateQuote();
  }, [formData.country, formData.postalCode, formData.city, formData.line1]);

  // Calculate subtotal from resolved items (for display and free shipping check)
  const subtotalCents = resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Pickup points are only available for France Metropolitan
  const isFrance = (formData.country || "FR").toUpperCase() === "FR";

  // Reset to home delivery if country changes to non-FR while pickup is selected
  useEffect(() => {
    if (!isFrance && deliveryMode === "pickup") {
      setDeliveryMode("home");
      setSelectedColissimoPoint(null);
      setColissimoPreferredMode("home");
    }
  }, [isFrance, deliveryMode]);

  // Simple address-based signature used to trigger refetch when address changes
  const quoteTriggerSignature = (() => {
    const address = getCurrentAddress();
    return buildAddressKey(address);
  })();

  // Activate shipping quote (pricing is computed locally from weight/address)
  const fetchShippingQuote = () => {
    if (!isStep1Complete || shippingProvider !== "colissimo") return;
    const address = getCurrentAddress();
    if (!address.country || !address.postalCode || !address.city) return;
    const cacheKey = `colissimo|${buildAddressKey(address)}`;
    if (quoteCacheKey === cacheKey && quoteStatus === "success") return;
    setQuoteStatus("success");
    setQuoteError(null);
    setQuoteCacheKey(cacheKey);
  };

  // Compute shipping price (FR flat / DOM+INT weight-based)
  const cartWeightGrams = resolvedItems.reduce((sum, item) => sum + item.quantity * FALLBACK_WEIGHT_GRAMS, 0);
  const finalShippingCents = computeColissimoShipping(cartWeightGrams, deliveryMode, speed, formData.country || "FR", subtotalCents);

  // Auto-trigger quote when Colissimo is selected on step 2
  useEffect(() => {
    if (currentStep === 2 && isStep1Complete && shippingProvider === "colissimo") {
      fetchShippingQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, shippingProvider, isStep1Complete, quoteTriggerSignature]);

  // Compute max reachable step
  const maxReachableStep = (() => {
    if (!isStep1Complete) return 1;
    if (!isStep2Complete || quoteStatus !== "success" || finalShippingCents === null) return 2;
    return 3;
  })();

  // Handle step navigation
  const goToStep = (step: 1 | 2 | 3) => {
    if (step <= maxReachableStep) {
      setCurrentStep(step);
    }
  };

  const emptyFormData: AddressFormValue = {
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "",
  };

  // Prefill form on mount (primary address or name/phone)
  useEffect(() => {
    if (customerProfile?.primaryAddress) {
      const addr = customerProfile.primaryAddress;
      setFormData({
        fullName: addr.fullName,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2 || "",
        city: addr.city,
        postalCode: addr.postalCode,
        country: addr.country,
      });
    } else if (customerProfile) {
      setFormData((prev) => ({
        ...prev,
        ...(customerProfile.name && { fullName: customerProfile.name }),
        ...(customerProfile.phone && { phone: customerProfile.phone }),
      }));
    }
  }, [customerProfile]);

  function handleAddressSelect(value: string) {
    if (value === "") {
      setSelectedAddressId(null);
      setFormData(emptyFormData);
      return;
    }
    const address = customerProfile?.addresses.find((a) => a.id === value);
    if (address) {
      setSelectedAddressId(value);
      setFormData({
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2 || "",
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
      });
    } else {
      setSelectedAddressId(null);
    }
  }

  const savedAddressOptions: readonly DropdownOption[] = [
    { value: "", label: t("newAddress") },
    ...(customerProfile?.addresses.map((addr) => ({
      value: addr.id,
      label: `${addr.fullName} – ${addr.line1}, ${addr.city}${
        addr.isPrimary ? ` ${t("primary")}` : ""
      }`,
    })) ?? []),
  ];

  // Restore Colissimo selection from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedMode = window.localStorage.getItem(
        "checkout.colissimo.carrierSelection"
      );
      if (savedMode === "home" || savedMode === "pickup") {
        setColissimoPreferredMode(savedMode);
      }

      const rawPoint = window.localStorage.getItem(
        "checkout.colissimo.relayPoint"
      );
      if (rawPoint) {
        const parsed = JSON.parse(rawPoint);
        if (parsed && typeof parsed.id === "string") {
          setSelectedColissimoPoint(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
    // run once on mount
     
  }, []);

  // Persist Colissimo selection in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (colissimoPreferredMode) {
        window.localStorage.setItem(
          "checkout.colissimo.carrierSelection",
          colissimoPreferredMode
        );
      } else {
        window.localStorage.removeItem(
          "checkout.colissimo.carrierSelection"
        );
      }

      if (selectedColissimoPoint) {
        window.localStorage.setItem(
          "checkout.colissimo.relayPoint",
          JSON.stringify(selectedColissimoPoint)
        );
      } else {
        window.localStorage.removeItem("checkout.colissimo.relayPoint");
      }
    } catch {
      // ignore storage errors
    }
  }, [colissimoPreferredMode, selectedColissimoPoint]);

  // Preload Colissimo relay points once per address signature (FR only)
  const preloadColissimoPoints = async (force = false) => {
    if (!isFrance) return;
    const address = getCurrentAddress();
    if (
      !address.line1 ||
      !address.postalCode ||
      !address.city ||
      !address.country
    ) {
      setColissimoPoints(null);
      setColissimoError(null);
      setColissimoLastKey(null);
      return;
    }

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = String(today.getFullYear());
    const shippingDate = `${dd}/${mm}/${yyyy}`;

    const weightGrams = 500; // TODO: derive real weight from cart items when available
    const filterRelay = 1;
    const optionInter = 0;
    const lang = "FR";

    const key = `${buildAddressKey(address)}|${weightGrams}|${shippingDate}|${filterRelay}|${optionInter}|${lang}`;

    if (
      !force &&
      colissimoLastKey === key &&
      colissimoPoints &&
      colissimoPoints.length > 0 &&
      !colissimoError
    ) {
      return;
    }

    setColissimoLoading(true);
    setColissimoError(null);

    try {
      const result = await fetchColissimoRelayPoints({
        address: address.line1,
        zipCode: address.postalCode,
        city: address.city,
        countryCode: address.country,
        weightGrams,
        shippingDate,
        filterRelay,
        optionInter,
        lang,
      });

      const sorted = [...result.points].sort((a, b) => {
        const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
        const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
        return da - db;
      });

      const top = sorted.slice(0, 20);
      setColissimoPoints(top);
      setColissimoLastKey(key);

      if (!selectedColissimoPoint && top.length > 0) {
        setSelectedColissimoPoint(top[0]);
      }
    } catch (e) {
      setColissimoPoints(null);
      setColissimoError(
        e instanceof Error ? e.message : "Failed to load Colissimo relay points"
      );
      if (force) {
        setColissimoLastKey(null);
      }
    } finally {
      setColissimoLoading(false);
    }
  };

  // Calculate totals (finalShippingCents already computed above)
  const currentShippingCents = finalShippingCents ?? 0;
  const totalCents = subtotalCents + currentShippingCents;

  // Auto-preload Colissimo points when carrier is selected and step 2 is active
  useEffect(() => {
    if (currentStep === 2 && shippingProvider === "colissimo") {
      void preloadColissimoPoints(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentStep,
    shippingProvider,
    selectedAddressId,
    formData.line1,
    formData.postalCode,
    formData.city,
    formData.country,
  ]);

  // Submit handler
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (!isStep1Complete || !isStep2Complete || (deliveryMode === "home" && quoteStatus !== "success")) {
      setError(t("completeAllSteps"));
      setLoading(false);
      return;
    }

    const effectiveCarrier: ShippingCarrierId = "colissimo";

    const effectiveShippingCents =
      typeof finalShippingCents === "number" ? finalShippingCents : 0; // TODO: ensure finalShippingCents is always computed before submit

    let snapshotPickupPoint: PickupPoint | null = null;
    const selectedPickupPoint:
      | PickupPoint
      | undefined = undefined;

    let pickupPointMeta: ShippingSnapshot["pickupPointMeta"] = undefined;

    if (deliveryMode === "pickup") {
      if (
        shippingProvider === "colissimo" &&
        selectedColissimoPoint
      ) {
        const cp = selectedColissimoPoint;
        let distance: string | undefined;
        if (cp.distanceMeters != null) {
          if (cp.distanceMeters < 1000) {
            distance = `${cp.distanceMeters} m`;
          } else {
            distance = `${(cp.distanceMeters / 1000).toFixed(1)} km`;
          }
        }
        snapshotPickupPoint = {
          id: cp.id,
          name: cp.name || "",
          addressLine1: cp.address.line1 || "",
          postalCode: cp.address.zipCode || "",
          city: cp.address.city || "",
          country: cp.address.countryCode || "FR",
          distance,
        };

        pickupPointMeta = {
          geo: cp.geo ?? null,
          openingHours: cp.openingHours ?? null,
          network: cp.network ?? null,
          type: cp.type ?? null,
          distanceMeters: cp.distanceMeters ?? null,
          addressLine2: cp.address.line2 ?? null,
          accessibilityPmr: null,
          maxWeightGrams: null,
        };
      }
    }

    const shippingSnapshot: ShippingSnapshot = {
      carrierId: effectiveCarrier,
      deliveryMode: deliveryMode || "home",
      speed: speed || "standard",
      shippingCents: effectiveShippingCents,
      pickupPoint: deliveryMode === "pickup" ? snapshotPickupPoint : null,
      pickupPointMeta,
    };

    // Validate shipping price: 0 is valid (free shipping), only null/undefined is invalid
    if (finalShippingCents === null || finalShippingCents === undefined) {
      setError(t("getShippingPrice"));
      setLoading(false);
      return;
    }

    let payload: Record<string, unknown>;
    if (selectedAddressId) {
      payload = {
        addressMode: "saved",
        addressId: selectedAddressId,
        notes,
        shipping: {
          carrierId,
          deliveryMode,
          speed,
          pickupPoint: selectedPickupPoint,
          shippingCents: finalShippingCents ?? 0,
        },
        shippingSnapshot,
      };
    } else {
      payload = {
        addressMode: "oneTime",
        address: {
          fullName: formData.fullName,
          phone: formData.phone,
          line1: formData.line1,
          line2: formData.line2.trim() || undefined,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
        },
        notes,
        shipping: {
          carrierId,
          deliveryMode,
          speed,
          pickupPoint: selectedPickupPoint,
          shippingCents: finalShippingCents ?? 0,
        },
        shippingSnapshot,
      };
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t("failedToStart"));
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { url: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(t("stripeUrlMissing"));
        setLoading(false);
      }
    } catch {
      setError(t("somethingWentWrong"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      {/* Step indicator (clickable) */}
      <div className="mb-8">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-16">
          {[
            { num: 1, label: t("stepAddress") },
            { num: 2, label: t("stepShipping") },
            { num: 3, label: t("stepPayment") },
          ].map((step, index) => {
            const stepNum = step.num as 1 | 2 | 3;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            const isReachable = stepNum <= maxReachableStep;
            const isClickable = isReachable;
            
            return (
              <div key={stepNum} className="flex items-center">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={isClickable ? () => goToStep(stepNum) : undefined}
                    disabled={!isClickable}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-green-600 text-white"
                        : isReachable
                        ? "bg-muted text-muted-foreground hover:bg-muted/80"
                        : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                    } ${isClickable ? "cursor-pointer" : ""}`}
                  >
                    {isCompleted ? "✓" : stepNum}
                  </button>
                  <span className={`mt-2 text-xs font-medium ${
                    isActive ? "text-foreground" : isReachable ? "text-muted-foreground" : "text-muted-foreground/50"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`h-0.5 w-16 mx-4 ${
                      isCompleted ? "bg-green-600" : isReachable ? "bg-border" : "bg-border/50"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exit checkout button */}
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/cart")}
        >
          {t("continueShopping")}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Address */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("step1Title")}</h2>

            {customerProfile && customerProfile.addresses.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <label htmlFor="savedAddressSelect" className="mb-2 block text-sm font-medium text-foreground">
                  {t("useSavedAddress")}
                </label>
                <CustomDropdown
                  value={selectedAddressId ?? ""}
                  options={savedAddressOptions}
                  onChange={handleAddressSelect}
                  ariaLabel={t("useSavedAddress")}
                />
              </div>
            )}

            <AddressForm
              idPrefix="checkout-address"
              value={formData}
              onChange={setFormData}
              errors={formErrors}
              disabled={false}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => goToStep(2)}
                disabled={!isStep1Complete}
              >
                {t("nextShipping")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Shipping */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("step2Title")}</h2>

            {/* Carrier: Colissimo (single carrier) */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                {t("shippingCarrier")}
              </label>
              <div className="grid grid-cols-1 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShippingProvider("colissimo");
                    setCarrierId("colissimo");
                    setDeliveryMode(colissimoPreferredMode ?? "home");
                  }}
                  className={`relative flex h-full items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
                    shippingProvider === "colissimo"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                    <svg
                      className="h-6 w-6 text-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {CARRIER_META.colissimo.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("pickupPointDesc")}
                    </div>
                  </div>
                  {shippingProvider === "colissimo" && (
                    <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Delivery mode */}
            {shippingProvider && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  {t("deliveryMode")}
                </label>
                <div className={`grid grid-cols-1 ${isFrance ? "sm:grid-cols-2" : ""} gap-3`}>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode("home");
                      setSelectedColissimoPoint(null);
                      setColissimoPreferredMode("home");
                    }}
                    className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                      deliveryMode === "home"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{t("homeDelivery")}</div>
                        <div className="text-xs text-muted-foreground">{t("homeDeliveryDesc")}</div>
                      </div>
                    </div>
                    {deliveryMode === "home" && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                  {isFrance && <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode("pickup");
                      setColissimoPreferredMode("pickup");
                    }}
                    className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                      deliveryMode === "pickup"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <svg
                          className="h-5 w-5 text-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {t("pickupPoint")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("pickupPointDesc")}
                        </div>
                      </div>
                    </div>
                    {deliveryMode === "pickup" && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>}
                </div>
              </div>
            )}

            {/* Colissimo Point Relais selector */}
            {shippingProvider === "colissimo" && deliveryMode === "pickup" && (
              <ColissimoPointRelaisSelector
                points={colissimoPoints}
                isLoading={colissimoLoading}
                errorMessage={colissimoError}
                onRefresh={() => {
                  void preloadColissimoPoints(true);
                }}
                selectedPoint={selectedColissimoPoint}
                onSelect={setSelectedColissimoPoint}
              />
            )}

            {/* Speed selection */}
            {deliveryMode && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  {t("deliverySpeed")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSpeed("standard")}
                    className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                      speed === "standard"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{t("standard")}</div>
                        <div className="text-xs text-muted-foreground">
                          {isFrance ? t("standardDays") : "Estimated delivery time varies by destination"}
                        </div>
                        {(() => {
                          const p = computeColissimoShipping(cartWeightGrams, deliveryMode, "standard", formData.country || "FR", subtotalCents);
                          return p !== null ? (
                            <div className="text-sm font-semibold text-foreground mt-1">
                              {p === 0 ? t("free") : `€${(p / 100).toFixed(2)}`}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    {speed === "standard" && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeed("express")}
                    className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                      speed === "express"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{t("express")}</div>
                        <div className="text-xs text-muted-foreground">
                          {isFrance ? t("expressDays") : "Priority handling (faster when available)"}
                        </div>
                        {(() => {
                          const p = computeColissimoShipping(cartWeightGrams, deliveryMode, "express", formData.country || "FR", subtotalCents);
                          return p !== null ? (
                            <div className="text-sm font-semibold text-foreground mt-1">
                              {p === 0 ? t("free") : `€${(p / 100).toFixed(2)}`}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    {speed === "express" && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Shipping quote status */}
            {shippingProvider === "colissimo" && (
              <div className="rounded-lg border border-border bg-card p-4">
                {quoteStatus === "loading" && (
                  <p className="text-sm text-muted-foreground text-center">{t("calculatingShipping")}</p>
                )}
                {quoteStatus === "error" && quoteError && (
                  <p className="text-sm text-error text-center">{quoteError || t("failedToGetQuote")}</p>
                )}
                {quoteStatus === "success" && finalShippingCents !== null && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t("shipping")}</p>
                    <p className="text-lg font-semibold text-foreground">
                      {finalShippingCents === 0 ? t("free") : `€${(finalShippingCents / 100).toFixed(2)}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => goToStep(1)}
              >
                {t("back")}
              </Button>
              <Button
                type="button"
                onClick={() => goToStep(3)}
                disabled={!isStep2Complete || quoteStatus !== "success" || finalShippingCents === null}
              >
                {t("nextPayment")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("step3Title")}</h2>

            <div className="space-y-1">
              <label htmlFor="notes" className="text-sm font-medium text-foreground">
                {t("orderNotes")}
              </label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Order Totals */}
            {subtotalCents > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span className="font-medium text-foreground">
                    €{(subtotalCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("shipping")}</span>
                  <span className="font-medium text-foreground">
                    {quoteStatus === "loading" ? (
                      t("calculating")
                    ) : finalShippingCents !== null ? (
                      finalShippingCents === 0 ? t("free") : `€${(finalShippingCents / 100).toFixed(2)}`
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold text-foreground">{t("total")}</span>
                  <span className="font-semibold text-foreground">
                    €{(totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-error">{error}</p>
            )}

            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => goToStep(2)}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !isStep1Complete ||
                  !isStep2Complete ||
                  quoteStatus !== "success" ||
                  finalShippingCents === null
                }
              >
                {loading ? "Redirecting..." : "Pay securely"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
