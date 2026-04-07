// app/dashboard/addresses/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { redirect } from "next/navigation";
import { getUserAddresses } from "@/features/account";
import { AddressesPageClient } from "@/features/account";

export default async function AddressesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const addresses = await getUserAddresses(session.user.id);

  return <AddressesPageClient initialAddresses={addresses} />;
}

