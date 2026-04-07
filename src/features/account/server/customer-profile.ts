import { prisma } from "@/server/db/prisma";

export interface CustomerProfile {
  name: string | null;
  email: string;
  phone: string | null;
  primaryAddress: Address | null;
  addresses: Address[];
}

export type Address = {
  id: string;
  userId: string | null;
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
};

/**
 * Get customer profile including user info and all saved addresses
 */
export async function getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: {
        where: {
          orderId: null, // Only get saved addresses, not order-linked ones
        },
        orderBy: [
          { isPrimary: "desc" },
          { createdAt: "desc" },
        ],
      },
    },
  });

  if (!user) return null;

  const addresses = user.addresses;
  const primaryAddress = addresses.find((addr) => addr.isPrimary) || null;

  return {
    name: user.name,
    email: user.email,
    phone: primaryAddress?.phone || null,
    primaryAddress,
    addresses,
  };
}
