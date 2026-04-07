import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { authOptions } from "@/server/auth/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AdminAvatarDropdown } from "@/shared/layout/nav/admin-avatar-dropdown";
import { AdminSearchInput } from "@/components/admin/admin-search-input";

export async function AdminTopbar() {
  const session = await getServerSession(authOptions);

  return (
    <div className="w-full border-b bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          <div>
            <h1 className="text-lg text-foreground">
              <Link href="/admin" className="font-semibold">
                Admin Dashboard
              </Link>
              <span className="mx-2 text-muted-foreground">|</span>
              <Link
                href="/fr"
                className="text-muted-foreground hover:text-foreground"
              >
                Frontstore
              </Link>
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage products, orders, inventory
            </p>
          </div>
          <div className="flex items-center gap-4">
            <AdminSearchInput />
            <AdminAvatarDropdown
              userName={session?.user?.name ?? null}
              userEmail={session?.user?.email ?? ""}
            />
            <ThemeToggle />
          </div>
        </div>
      </header>
    </div>
  );
}
