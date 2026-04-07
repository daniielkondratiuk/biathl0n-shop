export interface AddressFormValue {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  postalCode: string;
  line1: string;
  line2: string;
}

export type AddressFormErrors = Partial<Record<keyof AddressFormValue, string>>;

/**
 * Validates address form. Required: fullName, phone, country, city, postalCode, line1.
 * line2 (Address additional) is optional.
 * Returns an object of field keys to error messages; empty object if valid.
 */
export function validateAddressForm(data: AddressFormValue): AddressFormErrors {
  const err: AddressFormErrors = {};

  if (!String(data.fullName).trim()) {
    err.fullName = "Full name is required";
  }
  if (!String(data.phone).trim()) {
    err.phone = "Phone is required";
  }
  if (!String(data.country).trim()) {
    err.country = "Country is required";
  }
  if (!String(data.city).trim()) {
    err.city = "City is required";
  }
  if (!String(data.postalCode).trim()) {
    err.postalCode = "Postal code is required";
  }
  if (!String(data.line1).trim()) {
    err.line1 = "Address is required";
  }
  // line2 is optional

  return err;
}

export function isAddressFormValid(data: AddressFormValue): boolean {
  return Object.keys(validateAddressForm(data)).length === 0;
}
