"use client";

import { Input } from "@/components/ui/input";
import { CustomDropdown, type DropdownOption } from "@/shared/ui/custom-dropdown";
import { COUNTRIES } from "@/lib/constants/countries";
import type { AddressFormErrors, AddressFormValue } from "@/lib/utils/address-validation";
import { useTranslations } from "next-intl";

export interface AddressFormProps {
  value: AddressFormValue;
  onChange: (next: AddressFormValue) => void;
  errors?: AddressFormErrors;
  disabled?: boolean;
  idPrefix?: string;
  /** Dashboard only: show "Set as primary" checkbox */
  showPrimaryCheckbox?: boolean;
  isPrimary?: boolean;
  onPrimaryChange?: (v: boolean) => void;
}

export function AddressForm({
  value,
  onChange,
  errors = {},
  disabled = false,
  idPrefix = "address",
  showPrimaryCheckbox = false,
  isPrimary = false,
  onPrimaryChange,
}: AddressFormProps) {
  const id = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);
  const t = useTranslations("account.addressForm");

  const set = (key: keyof AddressFormValue, val: string) => {
    onChange({ ...value, [key]: val });
  };
  const countryOptions: readonly DropdownOption[] = [
    { value: "", label: t("selectCountry") },
    ...COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
  ];

  return (
    <div className="space-y-4">
      {/* 1. Full name (required) */}
      <div className="space-y-1">
        <label htmlFor={id("fullName")} className="text-sm font-medium text-foreground">
          {t("fullName")}
        </label>
        <Input
          id={id("fullName")}
          required
          value={value.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.fullName}
        />
        {errors.fullName && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.fullName}
          </p>
        )}
      </div>

      {/* 2. Phone (required) */}
      <div className="space-y-1">
        <label htmlFor={id("phone")} className="text-sm font-medium text-foreground">
          {t("phone")}
        </label>
        <Input
          id={id("phone")}
          required
          value={value.phone}
          onChange={(e) => set("phone", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.phone}
        />
        {errors.phone && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.phone}
          </p>
        )}
      </div>

      {/* 3. Country (required, SELECT) */}
      <div className="space-y-1">
        <label htmlFor={id("country")} className="text-sm font-medium text-foreground">
          {t("country")}
        </label>
        <CustomDropdown
          value={value.country}
          options={countryOptions}
          onChange={(nextValue: string) => {
            if (!disabled) set("country", nextValue);
          }}
          ariaLabel="Country"
        />
        {errors.country && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.country}
          </p>
        )}
      </div>

      {/* 4. City (required) */}
      <div className="space-y-1">
        <label htmlFor={id("city")} className="text-sm font-medium text-foreground">
          {t("city")}
        </label>
        <Input
          id={id("city")}
          required
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.city}
        />
        {errors.city && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.city}
          </p>
        )}
      </div>

      {/* 5. Postal code (required) */}
      <div className="space-y-1">
        <label htmlFor={id("postalCode")} className="text-sm font-medium text-foreground">
          {t("postalCode")}
        </label>
        <Input
          id={id("postalCode")}
          required
          value={value.postalCode}
          onChange={(e) => set("postalCode", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.postalCode}
        />
        {errors.postalCode && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.postalCode}
          </p>
        )}
      </div>

      {/* 6. Address (required) */}
      <div className="space-y-1">
        <label htmlFor={id("line1")} className="text-sm font-medium text-foreground">
          {t("address")}
        </label>
        <Input
          id={id("line1")}
          required
          value={value.line1}
          onChange={(e) => set("line1", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.line1}
        />
        {errors.line1 && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.line1}
          </p>
        )}
      </div>

      {/* 7. Address additional (optional) */}
      <div className="space-y-1">
        <label htmlFor={id("line2")} className="text-sm font-medium text-foreground">
          {t("addressAdditional")}
        </label>
        <Input
          id={id("line2")}
          value={value.line2}
          onChange={(e) => set("line2", e.target.value)}
          disabled={disabled}
          placeholder={t("optional")}
          aria-invalid={!!errors.line2}
        />
        {errors.line2 && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.line2}
          </p>
        )}
      </div>

      {showPrimaryCheckbox && onPrimaryChange && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={id("isPrimary")}
            checked={isPrimary}
            onChange={(e) => onPrimaryChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor={id("isPrimary")} className="text-sm text-foreground">
            {t("setAsPrimary")}
          </label>
        </div>
      )}
    </div>
  );
}
