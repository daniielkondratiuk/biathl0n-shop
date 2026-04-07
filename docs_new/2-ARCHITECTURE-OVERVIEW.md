# Architecture Overview

## Who this is for
This is for developers who want to understand how the app is organized.

## What you will learn
You will learn the main folders, how requests flow, and where key files live.

## Big picture
This app is split into clear parts.
Each part has a simple job.

1. Pages and routes live in `app/`.
2. Business features live in `src/features/`.
3. Integrations live in `src/server/integrations/`.
4. Shared server setup lives in `src/server/`.

## Main product areas
1. Store area: `app/[locale]/(store)`
2. Auth area: `app/[locale]/(auth)`
3. Admin area: `app/admin`
4. API area: `app/api`

## How a request usually flows
1. A user opens a page or sends a request.
2. The route is handled in `app/` or `app/api/`.
3. Business logic is handled in `src/features/`.
4. External services are called from `src/server/integrations/` when needed.

## Translation files
Translations are in:
1. `messages/en.json`
2. `messages/fr.json`

## Database schema path
The schema path is:
1. `prisma/schema.prisma`

Path is listed only.
Schema content is not verified in Phase 1.

## Architecture notes from project docs
1. `app/api/**` is described as thin route handlers.
2. Feature server code is in `src/features/**/server`.
3. Shared code is under `src/shared/**`.
4. Server infrastructure is under `src/server/**`.

## Important Phase 1 limits
- Not verified in Phase 1: Full list of every feature module.
- Not verified in Phase 1: Full list of all API endpoints.
- Not verified in Phase 1: Full dependency rules in every folder.

## Common problems
- I put business logic in the wrong folder.
- I do not know if code should go in `app/` or `src/features/`.
- I forget where integrations should live.
- I cannot find translation files quickly.
- I assume schema details without checking later phases.

## Related docs
- [Introduction](./1-INTRODUCTION.md)
- [Store Guide](./3-STORE-GUIDE.md)
- [Environment Variables](./15-ENVIRONMENT-VARIABLES.md)
