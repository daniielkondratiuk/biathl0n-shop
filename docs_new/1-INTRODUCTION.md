# Introduction

## Who this is for
This is for developers, testers, and admins who are new to this project.

## What you will learn
You will learn what this project is, where the main parts are, and where to start.

## Getting started
If you are new, start with `docs_new/16-DEPLOYMENT.md` to get the project from Git and run it locally. Then use `docs_new/15-ENVIRONMENT-VARIABLES.md` to fill your environment variables.

## What this project is
This project is an online shop.
The main domain is `predators.com`.
It has a store, login pages, admin pages, and API routes.

## Main areas in the code
1. Store pages: `app/[locale]/(store)`
2. Auth pages: `app/[locale]/(auth)`
3. Admin pages: `app/admin`
4. API routes: `app/api`
5. Feature code: `src/features`
6. Integrations: `src/server/integrations`

## Languages and translations
The translation files are:
1. `messages/en.json`
2. `messages/fr.json`

## Database schema path
The database schema file path is:
1. `prisma/schema.prisma`

We only list the path here in Phase 1.
We did not open this file in Phase 1.

## How to read this documentation set
1. Start with this file.
2. Read architecture next.
3. Then read the topic files one by one.
4. Keep notes for items marked as not verified.

## Scope notes for Phase 1
- Not verified in Phase 1: Exact full route list for every page.
- Not verified in Phase 1: Full database model details.
- Not verified in Phase 1: Full integration behavior details.

## Common problems
- I do not know where to begin in the code.
- I mix up store pages and admin pages.
- I forget where API routes are.
- I cannot find translation files.
- I try to read advanced docs too early.

## Related docs
- [Architecture Overview](./2-ARCHITECTURE-OVERVIEW.md)
- [Store Guide](./3-STORE-GUIDE.md)
- [Security and Roles](./17-SECURITY-AND-ROLES.md)
