# Admin Overview

## Who this is for
This is for admins and developers who need a quick map of the Admin panel.

## What you will learn
You will learn what Admin is, who can open it, and what main pages exist.

## What the Admin panel is
The Admin panel is the internal area for store management.
It is separate from normal user dashboard pages.
It is mounted under `/admin`.

## How to access it
1. Open `/admin`.
2. If you are not logged in, you are redirected to `/login?callbackUrl=/admin`.
3. If you are logged in but not admin, you are redirected to `/admin/access-denied`.

## Who can access it
1. Access check is done in `app/admin/layout.tsx`.
2. Only users with role `ADMIN` can access Admin pages.
3. User role comes from session data set by auth callbacks in `src/server/auth/auth.ts`.
4. The access denied page shows a message and links back to home or user dashboard.

## Main areas
### Dashboard
1. Route: `/admin`.
2. Uses `AdminDashboardPage`.
3. It shows overview cards and quick links for admin work.

### Analytics
1. Route: `/admin/analytics`.
2. Uses `AdminAnalyticsPage` with query params like range and tab.
3. It is for store analytics views.

### Products
1. Route: `/admin/products`.
2. Uses `ProductListPage`.
3. Product create/edit pages exist in the products feature module.

### Categories
1. Route: `/admin/categories`.
2. Uses `CategoriesListPage`.
3. Category create/edit pages exist in the categories feature module.

### Orders
1. Route: `/admin/orders`.
2. Uses `OrdersListPage`.
3. Order detail and update logic exists in the orders feature module.

### Inventory
1. Route: `/admin/inventory`.
2. Uses `AdminInventoryPage`.
3. Inventory movements page also exists at `/admin/inventory/movements`.

### Customers
1. Route: `/admin/customers`.
2. Current page text says customer management is coming soon.

### Discounts
1. Route: `/admin/discounts`.
2. Current page text says discount management is coming soon.

### Patches
1. Route: `/admin/patches`.
2. Uses `PatchesListPage`.
3. Not verified in Phase 5: full patch workflow details.

### Company
1. Route: `/admin/company`.
2. Uses `AdminCompanyPage`.
3. Company profile read/update functions exist in the company feature module.

### Search
1. Route: `/admin/search`.
2. Uses `AdminSearchPage`.
3. It accepts query param `q`.

### Settings
1. Route: `/admin/settings`.
2. Current page text says admin settings are coming soon.

### Profile
1. Route: `/admin/profile`.
2. Uses `AdminProfilePage`.
3. Not verified in Phase 5: full editable fields on this page.

## How navigation works
1. All Admin pages use `app/admin/layout.tsx`.
2. The layout renders `AdminSidebar` on the left.
3. The top header includes admin search input, avatar dropdown, and theme toggle.
4. Not verified in Phase 5: exact sidebar item order and every sidebar link label.

## Where things live in the code
- Admin layout and access gate: `app/admin/layout.tsx`
- Admin access denied page: `app/admin/access-denied/page.tsx`
- Admin routes: `app/admin/**`
- Dashboard feature: `src/features/admin/dashboard`
- Analytics feature: `src/features/admin/analytics`
- Categories feature: `src/features/admin/categories`
- Products feature: `src/features/admin/products`
- Orders feature: `src/features/admin/orders`
- Inventory feature: `src/features/admin/inventory`
- Company feature: `src/features/admin/company`
- Profile feature: `src/features/admin/profile`
- Search feature: `src/features/admin/search`
- Access control UI: `src/features/admin/access-control`
- Auth/session role source: `src/server/auth/auth.ts`

## Common problems
- Logged-out user opens `/admin` and gets sent to login.
- Logged-in non-admin user gets access denied.
- User expects customers/discounts/settings tools, but pages are marked coming soon.
- Team expects deep product or order docs in this file.
- Sidebar link name or order is different than expected.

## Related docs
- [Admin Products](./7-ADMIN-PRODUCTS.md)
- [Admin Orders](./8-ADMIN-ORDERS.md)
- [Admin Inventory](./9-ADMIN-INVENTORY.md)
- [Invoice System](./10-INVOICE-SYSTEM.md)
- [Upload System](./11-UPLOAD-SYSTEM.md)
- [Colissimo Integration](./12-COLISSIMO-INTEGRATION.md)
