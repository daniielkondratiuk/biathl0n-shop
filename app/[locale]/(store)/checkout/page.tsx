// app/checkout/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getCustomerProfile } from "@/features/account";
import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions);
  
  // Get customer profile if user is logged in
  const customerProfile = session?.user.id
    ? await getCustomerProfile(session.user.id)
    : null;

  return <CheckoutPageClient customerProfile={customerProfile} />;
}


