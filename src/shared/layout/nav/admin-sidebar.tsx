// src/shared/layout/nav/admin-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/products", label: "Products", icon: "🛍️" },
  { href: "/admin/patches", label: "Patches", icon: "🎨" },
  { href: "/admin/categories", label: "Categories", icon: "📁" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/inventory", label: "Inventory", icon: "📋" },
  { href: "/admin/discounts", label: "Discounts", icon: "🎫" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/company", label: "Company", icon: "🏢" },
  { href: "/admin/language-management", label: "Languages", icon: "🌐" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

/**
 * Determines if a navigation item should be active based on the current pathname.
 * 
 * Rules:
 * - For "/admin" (Dashboard): Only active on exact match
 * - For other routes: Active on exact match OR if pathname starts with the href followed by "/"
 *   (e.g., "/admin/products" is active for "/admin/products" and "/admin/products/123")
 * 
 * @param href - The navigation item's href
 * @param pathname - The current pathname
 * @returns true if the item should be active, false otherwise
 */
function isNavItemActive(href: string, pathname: string): boolean {
  // Exact match always works
  if (pathname === href) {
    return true;
  }

  // Special case: "/admin" (Dashboard) should only match exactly
  if (href === "/admin") {
    return false;
  }

  // For all other routes, check if pathname is a nested route
  // e.g., "/admin/products" should match "/admin/products/123"
  return pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card">
      <div className="sticky top-0 h-screen overflow-y-auto py-6">
        <nav className="space-y-1 px-4">
          {adminNavItems.map((item) => {
            const isActive = isNavItemActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

