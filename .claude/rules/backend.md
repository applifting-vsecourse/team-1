---
paths:
  - "apps/backend/**"
---

## Backend structure

One module per domain area under `apps/backend/src/modules/<module>/` with `controllers/` (+ `dto/`), `services/`, `repositories/`, `domain/`. Rules in [`apps/backend/src/modules/README.md`](../../apps/backend/src/modules/README.md). In short:

- Only repositories touch Prisma, and they return domain types, not Prisma types.
- Domain calculations (capacity, evaluation, price, debt) are pure functions in `domain/`, computed in exactly one place and unit-tested without a database.
- The acting user always comes from the session (`@User() user: Identity`), never from the request body.
- Protect controllers with `@Auth('ORGANIZER')` / `@Auth('PARTICIPANT')` (401 without a session, 403 for the wrong account type). Public endpoints have no decorator.
- Organization data is always filtered by `organizationId`; a foreign record returns 403 with no content. Use `OrganizationAccessService` (`shared/organization-access`) — never hand-roll the check.
- Capacity, evaluation and price come only from `modules/applications/domain` (`capacity.ts`, `evaluation.ts`, `pricing.ts`). Reuse them; don't recompute.
- The worked example module is `modules/account` (`GET /api/me`).
- Money is whole CZK as `Int`.
