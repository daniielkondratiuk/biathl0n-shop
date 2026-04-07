# 9) Admin Inventory

## Who this is for
This is for admin users who manage product stock.

## What you will learn
1. What inventory means in this shop.
2. How to open inventory pages.
3. How to view stock.
4. How to adjust stock.
5. How to read inventory movements.
6. Where the main inventory code lives.

## 1) What “Inventory” means
Inventory means how many items you have in stock.

In this admin area, you can see:
1. On-hand stock.
2. Reserved stock.
3. Available stock.

Available stock is shown as:
1. On hand minus reserved.
2. Not below zero in the UI.

## 2) Open Inventory pages
Use these admin routes:
1. `/admin/inventory` for current stock.
2. `/admin/inventory/movements` for stock change history.

## 3) Inventory page: view stock
Route: `/admin/inventory`

What the table shows:
1. Product name.
2. Color and size.
3. SKU.
4. Available quantity.
5. Reserved quantity.
6. Stock status badge (`In stock`, `Low stock`, `Out of stock`).
7. Actions (`Adjust`, `View`).

Search and table controls:
1. Search by product name or SKU.
2. Page size selector (10, 25, 50).
3. Pagination when there are many rows.
4. Sort by `Available`, `Reserved`, and `Status` from table headers.

Notes:
1. Low stock is shown when available is `10` or less.
2. Out of stock is shown when available is `0`.

## 4) Adjust stock (IMPORTANT)
You adjust stock from the inventory table.

Steps:
1. Go to `/admin/inventory`.
2. Find the SKU row.
3. Click `Adjust`.
4. In the modal, choose `Add` or `Remove`.
5. Enter `Quantity` (must be at least 1).
6. Click `Add to stock` or `Remove from stock`.

What the modal shows:
1. SKU.
2. Current `On hand`, `Reserved`, and `Available`.
3. A live preview of values after change.

Validation:
1. You cannot remove more than on-hand stock.
2. Quantity must be a number and at least 1.

What `Add` and `Remove` mean:
1. `Add` increases on-hand stock.
2. `Remove` decreases on-hand stock.

What happens after saving:
1. The UI sends `POST /api/inventory/adjust`.
2. The API updates the variant stock.
3. The API writes an inventory movement with type `ADJUSTMENT`.
4. The page refreshes and shows updated values.

API and access notes:
1. This endpoint is admin-only.
2. The payload uses `variantId`, `newStock`, and `reason`.
3. In this modal flow, the reason is sent as `correction`.

## 5) Movements page
Route: `/admin/inventory/movements`

A movement is one stock change record.
You can use it to check what changed and when.

What the movements table shows:
1. Date and time.
2. Product name and SKU.
3. Size.
4. Movement type.
5. Quantity change (plus or minus).
6. Order link (if there is an order).
7. Reason text.

Filters and search:
1. Search by SKU or product name.
2. Filter by type (`Reserved`, `Adjustment`, `Purchase`, `Return`, `Cancellation`).
3. Date range filter (from shared dashboard filter control).
4. Pagination.

How to use it for auditing:
1. Search for a SKU.
2. Filter by movement type if needed.
3. Check the date, quantity sign, and reason.
4. Open linked order when available.

## 6) Where things live in the code
Main routes:
1. `app/admin/inventory/page.tsx`
2. `app/admin/inventory/movements/page.tsx`
3. `app/api/inventory/adjust/route.ts`

Admin inventory feature:
1. `src/features/admin/inventory/ui/admin-inventory-page.tsx`
2. `src/features/admin/inventory/ui/inventory-table.tsx`
3. `src/features/admin/inventory/ui/admin-inventory-movements-page.tsx`
4. `src/features/admin/inventory/server/inventory-admin.ts`
5. `src/features/admin/inventory/server/adjust-inventory.ts`

Adjust modal:
1. `components/admin/adjust-stock-modal.tsx`

## Common problems
- I click `Adjust` but save fails. Check you are logged in as an admin.
- I cannot remove stock. The quantity may be higher than on-hand stock.
- My search shows no rows. Clear search text and filters.
- I do not see all rows. Check page number and page size.
- I cannot find one movement. Try a wider date range.
- I cannot open the order from a movement. Some movements have no order link.

## Related docs
- `docs_new/7-ADMIN-PRODUCTS.md`
- `docs_new/8-ADMIN-ORDERS.md`
