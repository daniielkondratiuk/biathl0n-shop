// src/shared/layout/navbar-server.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getAllCategories } from "@/features/products";
import { AdminTopbar } from "@/shared/layout/nav";
import { NavbarClient } from "@/shared/layout/navbar-client";
import { getEnabledLanguagesForStorefront } from "@/server/services/languages";

export async function NavbarServer() {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? null;
  const categories = await getAllCategories();
  const enabledStorefrontLanguages = await getEnabledLanguagesForStorefront();

  return (
    <>
      {user?.role === "ADMIN" && (
        <div className="sticky top-0 z-[9999] w-full">
          <AdminTopbar />
        </div>
      )}
      <NavbarClient
        user={user}
        categories={categories}
        enabledLocales={enabledStorefrontLanguages}
      />
    </>
  );
}


