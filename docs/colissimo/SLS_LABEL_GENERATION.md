# Colissimo SLS – Label Generation (v3.1)

## Overview

We use the REST endpoint:

```
POST https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/3.1/generateLabel
```

Authentication:
- Header: `apikey: process.env.COLISSIMO_WS_API_KEY`

No contract password is used for SLS.

---

## Architecture

Entry point (single order):

```
app/api/shipping/laposte/colissimo/label/[orderId]/route.ts
```

Flow:

1. Validate:
   - `order.status === "PAID"`
   - no existing `labelPath`
   - carrier is `"colissimo"`

2. Extract `SHIPPING_SNAPSHOT` from `order.notes`

3. Build sender from `CompanyProfile`

4. Build recipient:
   - If `deliveryMode === "pickup"`:
     - Use pickupPoint address (`addressLine1`, `postalCode`, `city`)
     - Keep customer `fullName`
   - Else:
     - Use `order.address`

5. Call:
   `createColissimoLabelFromOrder()`

6. On success:
   - Save PDF to `storage/colissimo/labels/{orderNumber}.pdf`
   - Update order:
     - `status` → `PROCESSING`
     - `trackingNumber`
     - `labelPath`
     - `labelGeneratedAt`
   - Create AuditLog entry: `ORDER_LABEL_GENERATED`

---

## Multipart Parsing

Colissimo returns:

```
Content-Type: multipart/related
```

We:
- Parse Buffer safely
- Extract JSON part
- Extract PDF binary part
- Base64 encode PDF
- Extract `trackingNumber` from:
  `labelV31Response.parcelNumber`

---

## Environment Variables

```
COLISSIMO_WS_API_KEY
COLISSIMO_WS_BASE_URL (optional, defaults to https://ws.colissimo.fr)
```

---

## Status Transition

```
PAID → (generate label) → PROCESSING
```

`SHIPPED` is NOT set at label generation time.
It is handled by Tracking sync.
