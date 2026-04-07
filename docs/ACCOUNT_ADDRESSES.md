# Account Addresses Documentation

## Overview

Customer address book features allow users to manage saved addresses in their dashboard and use them during checkout.

## Database Schema

### Address Model
- `isPrimary` (Boolean, default: false) - Primary address flag
- `userId` (String, relation to User)
- `orderId` (String, optional) - Links address to order (historical records)
- Index: `@@index([userId, isPrimary])` for efficient primary address queries

### Data Rules
- Only one primary address per user (enforced via transaction)
- Order-linked addresses (`orderId` is not null) cannot be:
  - Set as primary
  - Deleted
  - Modified via address book (they're historical records)
- Saved addresses (`orderId` is null) are managed via the address book

## Features

### Address Book (`/dashboard/addresses`)
- List all saved addresses
- Add new addresses with form
- Mark one address as "Primary" (only one primary per user)
- Delete addresses (only saved addresses, not order-linked)
- Primary badge shown on primary address
- "Set as primary" action for non-primary addresses

### Checkout Integration (`/checkout`)
- Prefill form with primary address if available
- Dropdown to select from saved addresses
- Manual editing always allowed
- Falls back gracefully for guest users (no saved addresses)

### Customer Profile Service
- Single reusable service function `getCustomerProfile()`
- Returns: name, email, phone (from primary address), primary address, all addresses
- Used by both dashboard and checkout
- Server-side fetching (no extra client fetches)

## API Endpoints

### `GET /api/addresses`
- Returns all saved addresses for authenticated user
- Requires authentication

### `POST /api/addresses`
- Creates new address
- Body: `{ fullName, phone, line1, line2?, city, state?, postalCode, country, isPrimary? }`
- Automatically unsets other primary addresses if `isPrimary: true`

### `PATCH /api/addresses/[id]/primary`
- Sets address as primary
- Automatically unsets previous primary address

### `DELETE /api/addresses/[id]`
- Deletes saved address
- Only works for saved addresses (not order-linked)

## Migration

To add the `isPrimary` field:
```bash
npx prisma migrate dev --name add_is_primary_to_address
```

The migration will:
1. Add `isPrimary` column to `Address` table with default value `false`
2. Create index on `[userId, isPrimary]` for performance

## Notes

- The checkout page works for both authenticated and guest users
- Addresses created during checkout are not automatically saved to the address book
- The implementation follows the existing codebase patterns (server components, API routes, feature server modules)

