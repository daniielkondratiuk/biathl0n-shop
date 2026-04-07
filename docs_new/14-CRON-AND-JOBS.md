# 14) Cron and Jobs

## Who this is for
This is for developers and admins.

## What you will learn
1. What a job means in this project.
2. How Colissimo tracking sync job works.
3. Which routes can trigger the job.
4. How internal cron route is protected.
5. What job state is stored.
6. What is not verified in this phase.

## 1) What a “job” means in this project
A job is a background task.

It can run without a user clicking normal checkout buttons.

In these files, the main job is:
1. Colissimo tracking sync for orders.

## 2) Colissimo tracking sync job
Main job file:
1. `src/server/jobs/sync-colissimo-tracking.ts`

What this job does:
1. Finds eligible orders (status `PROCESSING`, carrier `colissimo`, tracking number present).
2. Calls Colissimo tracking integration for each eligible order.
3. Decides if order should stay same or move to `SHIPPED`/`DELIVERED`.
4. Updates order status only forward (no downgrade).
5. Returns a summary with counts and per-order results.

Extra behavior:
1. Uses a small concurrency pool (3 workers).
2. Supports `manual` and `auto` modes.
3. In `auto` mode, it updates last auto-sync timestamp.

## 3) Internal cron route
Cron route:
1. `POST /api/internal/cron/tracking/colissimo`

How it is protected:
1. Requires header `x-cron-secret`.
2. Header must match server cron secret.
3. Wrong or missing secret returns unauthorized.

What it returns:
1. On success, it returns tracking sync summary.
2. On error, it returns an error response.

Schedule note:
1. Route comments mention every 12 hours.
2. Real external scheduler setup is Not verified in Phase 13.

## 4) Manual admin triggers (verified)
Manual sync route:
1. `POST /api/admin/orders/tracking/sync`
2. Optional body: `orderIds` list to sync specific orders.

Auto-sync route:
1. `POST /api/admin/orders/tracking/auto-sync`
2. Runs same job in `auto` mode.

Last-run info route:
1. `GET /api/admin/orders/tracking/auto-sync/last-run`
2. Returns last auto-sync timestamp.

Important note:
1. In these route files, explicit admin auth checks are Not verified in Phase 13.

## 5) Job state / locking
Job state file:
1. `src/server/db/admin-job-state.ts`

What is stored:
1. Last auto-sync run time (`lastRunAt`) for Colissimo auto-sync key.
2. Read helper and upsert helper are implemented.

Locking behavior:
1. No explicit lock or "single-run" guard is verified in these files.
2. Locking/double-run prevention is Not verified in Phase 13.

## 6) What is NOT automated (or not verified)
1. External scheduler provider is Not verified in Phase 13.
2. Exact production schedule is Not verified in Phase 13.
3. Other background jobs outside Colissimo tracking are Not verified in Phase 13.

## 7) Where things live in the code
Cron route:
1. `app/api/internal/cron/tracking/colissimo/route.ts`

Admin trigger routes:
1. `app/api/admin/orders/tracking/sync/route.ts`
2. `app/api/admin/orders/tracking/auto-sync/route.ts`
3. `app/api/admin/orders/tracking/auto-sync/last-run/route.ts`

Tracking proxy route:
1. `app/api/shipping/colissimo/tracking/route.ts`

Job and support files:
1. `src/server/jobs/sync-colissimo-tracking.ts`
2. `src/server/integrations/colissimo-tracking.ts`
3. `src/server/db/admin-job-state.ts`

## Common problems
- Cron route returns unauthorized. Check `x-cron-secret` header value.
- Sync returns no updates. Orders may not match eligibility rules.
- Many unchanged results. Tracking may not have reached shipped/delivered states.
- last-run is null. Auto-sync may not have run yet.
- Manual sync returns input error. `orderIds` format may be invalid.
- Tracking API errors appear in results. Upstream Colissimo service may be unavailable.

## Related docs
- `docs_new/12-COLISSIMO-INTEGRATION.md`
- `docs_new/8-ADMIN-ORDERS.md`
