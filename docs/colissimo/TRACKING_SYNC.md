# Colissimo Tracking Sync (CDC v2.6)

## Overview

Tracking uses:

```
POST https://ws.colissimo.fr/tracking-timeline-ws/rest/tracking/timelineCompany
```

Authentication:
- `contractNumber`
- `password`

Environment:

```
COLISSIMO_SLS_CONTRACT_NUMBER
COLISSIMO_SLS_PASSWORD
```

---

## Architecture

Core client:
`src/server/integrations/colissimo-tracking.ts`

Sync job:
`src/server/jobs/sync-colissimo-tracking.ts`

Manual endpoint:
`POST /api/admin/orders/tracking/sync`

Cron endpoint:
`POST /api/internal/cron/tracking/colissimo`
Header required:
`x-cron-secret = process.env.CRON_SECRET`

---

## Sync Logic

We only check:

Orders where:
- `status === "PROCESSING"`
- `carrier === "colissimo"`
- `trackingNumber` is not empty

For each tracking number:

Call `timelineCompany`.

Parse:

```
data.parcel.step[]
```

If `STEP_STATUS_ACTIVE` with:
- `stepId >= 1` → `SHIPPED`
- `stepId == 5` → `DELIVERED`

We never downgrade status.

---

## Outcomes

**UPDATED:**
Order status changed.

**UNCHANGED:**
No active step or still step 0 (Annonce).

**UNAUTHORIZED:**
API code 202 (tracking service not enabled).

**FAILED:**
Network error or unexpected response.

---

## Status Transition Matrix

```
PROCESSING → SHIPPED  (step 1 active)
SHIPPED    → DELIVERED (step 5 active)
```

No automatic downgrade.

---

## Polling Strategy

Recommended:
Run every 12 hours via external scheduler calling:

```
POST /api/internal/cron/tracking/colissimo
```

---

## Notes

Tracking currently returns:
`code=202` "Service non autorisé pour cet identifiant"

This means the tracking service is not yet enabled for the contract.

Once enabled, status transitions will work automatically.
