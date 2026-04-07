# Orders System Documentation

## Overview

The admin orders system provides comprehensive order management with search, filtering, bulk actions, and order tracking.

## Features

### Search System
- **Debounced search** (300ms) for real-time filtering
- Searches by: Order ID, Order Number, Customer Name, Customer Email, Product Name
- Server-side filtering with Prisma OR conditions
- URL parameter: `?q=searchterm`

### Order Numbers
- Human-friendly format: `UFO-000123`
- Auto-generated for new orders
- Backfill script available for existing orders
- Shown in table and details page
- Unique and indexed for performance

### Order Notes
- Display notes on order details page
- Notes icon (📝) in table for orders with notes
- "No notes" message when empty

### Bulk Actions
- Multi-select checkboxes with "Select All"
- Bulk update fulfillment status
- Bulk delete (soft delete - sets status to CANCELED)
- Bulk export to CSV
- Bulk actions bar appears when orders are selected

### Advanced Filters
- **Payment Status**: Paid, Pending, Failed, Refunded
- **Fulfillment Status**: Pending, Processing, Shipped, Delivered, Canceled
- **Date Range**: Today, Last 7 days, Last 30 days
- All filters work with search and pagination

### Enhanced Table
- Checkboxes for bulk selection
- Order number display
- Customer avatar initials
- Product thumbnails
- Notes indicator icon
- Improved column alignment
- Stripe-style borders and hover effects

### Order Details Page
- Order number in header
- Copy ID and Copy Order # buttons
- Order notes section
- Tracking number input
- Carrier selector (UPS, FedEx, USPS, DHL, Other)
- Improved timeline with timestamps
- Two-column layout (Stripe-style)

### Pagination
- Server-side pagination (20 items per page)
- Works with all filters and search
- Shows total pages and current page
- Next/Previous buttons

## Database Schema

### Order Model Fields
- `orderNumber` (String, unique, indexed) - Human-friendly order number
- `trackingNumber` (String, optional) - Shipping tracking number
- `carrier` (String, optional) - Shipping carrier (UPS, FedEx, USPS, DHL, Other)
- `notes` (String, optional) - Order notes
- `status` (OrderStatus enum) - Fulfillment status
- `paymentStatus` (PaymentStatus enum) - Payment status
- Indexes on `orderNumber` and `createdAt` for performance

## API Endpoints

### Order Management
- `GET /api/orders` - List orders (with filters, search, pagination)
- `GET /api/orders/[id]` - Get order details
- `PATCH /api/orders/[id]` - Update order (status, tracking, carrier, notes)

### Bulk Operations
- `PATCH /api/orders/bulk-update` - Bulk update order status
- `DELETE /api/orders/bulk-update` - Bulk delete (soft delete)
- `POST /api/orders/export` - Export orders to CSV

## Inventory Lifecycle

### Reservation
- When order is created, inventory is reserved
- Stock is deducted from available inventory
- Reserved items cannot be purchased by others

### Deduction
- On payment confirmation (Stripe webhook):
  - Inventory is permanently deducted
  - Order status updated to PAID
  - Stock levels updated

### Cancellation
- If order is canceled:
  - Reserved inventory is released back to available stock
  - Order status set to CANCELED

## Order Number Generation

### Format
- Pattern: `UFO-{6-digit-number}`
- Example: `UFO-000123`
- Auto-incremented from highest existing number

### Backfill Script
To generate order numbers for existing orders:
```bash
npx ts-node scripts/generate-order-numbers.ts
```

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

