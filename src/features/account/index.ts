export { AccountTabs } from "./ui/account-tabs";
export { AddressForm } from "./ui/address-form";
export { AddressesPageClient } from "./ui/addresses-page-client";
export { OrderStatusSteps } from "./ui/order-status-steps";
export { DashboardProfilePage } from "./ui/dashboard-profile-page";
export { PaymentSettingsPage } from "./ui/payment-settings-page";

export {
  getCustomerProfile,
  type CustomerProfile,
  type Address,
} from "./server/customer-profile";

export {
  getUserAddresses,
} from "./server/user-addresses";

export {
  createAddress,
  deleteAddress,
  type CreateAddressError,
} from "./server/addresses";

export {
  setPrimaryAddress,
} from "./server/addresses-primary";
