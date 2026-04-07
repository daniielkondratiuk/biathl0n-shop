// src/features/admin/search/ui/admin-search-page.tsx
import { Suspense } from "react";
import { searchAdmin } from "@/features/admin/search";
import { StatusBadge } from "@/shared/ui/admin/status-badge";
import Link from "next/link";
import { AvatarInitials } from "@/shared/ui/admin/avatar-initials";
import { formatOrderRefShort } from "@/lib/utils/order-ref";

type SearchOrder = {
  id: string;
  orderNumber?: string | null;
  createdAt: string | Date;
  total: number;
  currency?: string;
  user?: { name?: string | null; email?: string | null };
  address?: { fullName?: string | null };
  payment?: { status?: string } | null;
};

async function SearchResults({ query }: { query: string }) {
  if (!query || query.trim().length < 2) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Enter at least 2 characters to search
        </p>
      </div>
    );
  }

  const results = await searchAdmin(query);

  const hasResults =
    results.orders.length > 0 ||
    results.products.length > 0 ||
    results.customers.length > 0;

  if (!hasResults) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          No results found for &quot;{query}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Orders */}
      {results.orders.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Orders ({results.orders.length})
            </h2>
            <Link
              href={`/admin/orders?q=${encodeURIComponent(query)}`}
              className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(results.orders as SearchOrder[]).map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AvatarInitials
                      name={order.user?.name || order.address?.fullName || "Guest"}
                      email={order.user?.email}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {formatOrderRefShort(order.orderNumber, order.id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.user?.email || "Guest"} ·{" "}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {order.payment && (
                      <StatusBadge
                        status={order.payment.status || "PENDING"}
                        type="payment"
                        size="sm"
                      />
                    )}
                    <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {(order.total / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: order.currency || "usd",
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      {results.products.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Products ({results.products.length})
            </h2>
            <Link
              href={`/admin/products?q=${encodeURIComponent(query)}`}
              className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {results.products.map((product) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {product.title || product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.category.name} · {product.slug}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Customers */}
      {results.customers.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Customers ({results.customers.length})
            </h2>
            <Link
              href={`/admin/customers?q=${encodeURIComponent(query)}`}
              className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {results.customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <AvatarInitials
                    name={customer.name}
                    email={customer.email}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {customer.name || "No name"}
                    </p>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface AdminSearchPageProps {
  query?: string;
}

export async function AdminSearchPage({ query }: AdminSearchPageProps) {
  const searchQuery = query || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search across orders, products, and customers
        </p>
      </div>

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Searching...</p>
          </div>
        }
      >
        <SearchResults query={searchQuery} />
      </Suspense>
    </div>
  );
}

