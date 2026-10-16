# kemp.io

Registration platform for multi-term events (camps): organizers set up an event with terms, prices and gendered rooms; applicants apply from a public link without an account; each term is evaluated separately into confirmed / waitlisted by free beds per gender; organizers track occupancy, applications and manually recorded payments. School team project (4IT580).

pnpm monorepo with two apps:

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client.

**Before deciding anything about product behaviour or architecture, read [`docs/PROJEKT.md`](docs/PROJEKT.md).** It records scope, decisions (several deliberately differ from the GitHub issues — section 11), the data model, routes, API paths and which stream owns which folder. When an issue and PROJEKT.md disagree, PROJEKT.md wins.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

Workflow (branches, PRs, Definition of Done): [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Conventions

This file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### Language

Code, database, API paths, commit messages and code comments in English. Everything a user reads — UI copy, page URLs, e-mails — in Czech. Docs, issues and PR descriptions in Czech.

### Backend structure

One module per domain area under `apps/backend/src/modules/<module>/` with `controllers/` (+ `dto/`), `services/`, `repositories/`, `domain/`. Rules in [`apps/backend/src/modules/README.md`](apps/backend/src/modules/README.md). In short:

- Only repositories touch Prisma, and they return domain types, not Prisma types.
- Domain calculations (capacity, evaluation, price, debt) are pure functions in `domain/`, computed in exactly one place and unit-tested without a database.
- The acting user always comes from the session (`@User() user: Identity`), never from the request body.
- Organization data is always filtered by `organizationId`; a foreign record returns 403 with no content.
- Money is whole CZK as `Int`.

### Frontend structure

- Shared components follow atomic design: `components/{atoms,molecules,organisms,templates,pages}`, plus vendored shadcn in `components/ui`. A layer imports only from lower layers; `components/` never imports from `features/`. ESLint enforces both. Details: [`apps/frontend/src/components/README.md`](apps/frontend/src/components/README.md).
- Domain code lives in `features/<feature>/{api,hooks,components,lib}`. Features don't import from each other.
- Route files in `src/routes/` stay thin: load data, compose the page. All paths are in `src/app/routes.ts` (`ROUTES`).
- Imports use the `@/` alias; relative imports only for siblings.
- Every server payload is parsed with a zod schema in `features/<feature>/api/`.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI puts `shadow-xs`/`shadow-sm` on inputs, textareas and cards. [`DESIGN.md`](DESIGN.md) keeps shadows for things that genuinely float — dialogs, dropdowns, toasts. Strip them.

### Migrations

At most one Prisma migration per PR. Before merging, rebase on `main`; if another migration landed meanwhile, delete yours and regenerate it.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.
