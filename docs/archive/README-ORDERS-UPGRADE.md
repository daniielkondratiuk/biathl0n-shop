# Admin Orders System Upgrade

## Overview

The admin orders system has been upgraded to a production-ready, Stripe-level solution with comprehensive features.

## New Features

### 1. Search System
- **Debounced search** (300ms) for real-time filtering
- Searches by: Order ID, Order Number, Customer Name, Customer Email, Product Name
- Server-side filtering with Prisma OR conditions
- URL parameter: `?q=searchterm`

### 2. Order Numbers
- Human-friendly order numbers in format: `UFO-000123`
- Auto-generated for new orders
- Backfill script available for existing orders
- Shown in table and details page

### 3. Order Notes
- Display notes on order details page
- Notes icon (📝) in table for orders with notes
- "No notes" message when empty

### 4. Bulk Actions
- Multi-select checkboxes with "Select All"
- Bulk update fulfillment status
- Bulk delete (soft delete - sets status to CANCELED)
- Bulk export to CSV
- Bulk actions bar appears when orders are selected

### 5. Advanced Filters
- **Payment Status**: Paid, Pending, Failed, Refunded
- **Fulfillment Status**: Pending, Processing, Shipped, Delivered, Canceled
- **Date Range**: Today, Last 7 days, Last 30 days
- All filters work with search and pagination

### 6. Enhanced Table
- Checkboxes for bulk selection
- Order number display
- Customer avatar initials
- Product thumbnails
- Notes indicator icon
- Improved column alignment
- Stripe-style borders and hover effects

### 7. Order Details Page
- Order number in header
- Copy ID and Copy Order # buttons
- Order notes section
- Tracking number input
- Carrier selector (UPS, FedEx, USPS, DHL, Other)
- Improved timeline with timestamps
- Two-column layout (Stripe-style)

### 8. Pagination
- Server-side pagination (20 items per page)
- Works with all filters and search
- Shows total pages and current page
- Next/Previous buttons

## Database Changes

### Schema Updates
- Added `orderNumber` field (unique, indexed)
- Added `trackingNumber` field
- Added `carrier` field
- Added indexes on `orderNumber` and `createdAt`

### Migration Required
Run the migration to add the new fields:
```bash
npx prisma migrate dev --name add_order_fields
```

### Backfill Order Numbers
To generate order numbers for existing orders:
```bash
npx ts-node scripts/generate-order-numbers.ts
```

## API Endpoints

### New Endpoints
- `PATCH /api/orders/bulk-update` - Bulk update order status
- `DELETE /api/orders/bulk-update` - Bulk delete (soft delete)
- `POST /api/orders/export` - Export orders to CSV

### Updated Endpoints
- `PATCH /api/orders/[id]` - Now supports `trackingNumber` and `carrier` updates

## Components

### New Components
- `DebouncedSearch` - Search input with debounce
- `AvatarInitials` - Customer avatar with initials
- `BulkActionsBar` - Bulk actions toolbar
- `OrdersPageClient` - Client wrapper for orders page
- `OrderTimeline` - Visual order progress timeline

### Updated Components
- `OrdersTable` - Added checkboxes, avatars, notes icon
- `OrdersFilters` - Added date range filter
- `StatusBadge` - Color-coded status badges
- `OrderMetricCard` - Metric display cards

## Usage

### Search Orders
Type in the search box to filter orders by ID, number, customer, or product. Results update automatically after 300ms.

### Filter Orders
Use the dropdown filters to filter by:
- Payment status
- Fulfillment status
- Date range

### Bulk Actions
1. Select orders using checkboxes
2. Use "Select All" to select all visible orders
3. Choose an action from the bulk actions bar:
   - Update status
   - Export to CSV
   - Cancel orders

### Order Details
- View complete order information
- Update fulfillment status
- Add tracking number and carrier
- Copy order ID or order number
- View order timeline

## Performance

- Server-side filtering and pagination
- Prisma indexes on frequently queried fields
- Efficient queries with proper includes
- No N+1 query issues

## Styling

All components use the Stripe-inspired light mode palette:
- Background: #F8FAFC
- Foreground: #0F172A
- Card: #FFFFFF
- Border: #E2E8F0
- Accent: #2563EB

