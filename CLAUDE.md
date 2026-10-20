# Togena

Registration platform for multi-term events (camps): organizers set up an event with terms, prices and gendered rooms; applicants apply from a public link without an account; each term is evaluated separately into confirmed / waitlisted by free beds per gender; organizers track occupancy, applications and manually recorded payments. School team project (4IT580).

pnpm monorepo with two apps:

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client.

**Before deciding anything about product behaviour or architecture, read [`docs/PROJEKT.md`](docs/PROJEKT.md).** It records scope, decisions (several deliberately differ from the GitHub issues — section 11), the data model, routes, API paths and which stream owns which folder. When an issue and PROJEKT.md disagree, PROJEKT.md wins.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

**Before redesigning screens in Figma, read [`docs/FIGMA-REMAKE.md`](docs/FIGMA-REMAKE.md)** and follow its patterns, the logo-corner rule and the workflow.

Workflow (branches, PRs, Definition of Done): [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend test:int` — backend integration tests (`*.int-spec.ts`): builds and starts the server against the `togena_test` database; helpers in `apps/backend/src/test/integration/test-api.ts`
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Conventions

This file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### Language

Code, database, API paths, page URLs, commit messages and code comments in English. Docs, issues and PR descriptions in Czech.

Everything a user reads — UI copy, e-mails, error messages — is localized English / Czech (English is the default):

- Frontend: never hardcode copy. Add keys to both `apps/frontend/src/i18n/locales/en/<namespace>.json` and `cs/<namespace>.json` (namespace = your feature) and use `useTranslation("<namespace>")`. Keys are type-checked; a test fails when the two languages differ.
- Money and dates: `formatCzk` / `formatDate` from `@/lib`, never `toLocaleString` by hand.
- Backend errors: throw `AppException(status, code)` with a code from `shared/errors/error-code.ts` and add the code to both `errors.json` files. Every error response is `{ statusCode, code, message }`.
- E-mails: copy for both locales lives in the template; send in `User.locale` / `Application.locale`. Read the request language with `@RequestLocale()`.

### Backend structure

One module per domain area under `apps/backend/src/modules/<module>/` with `controllers/` (+ `dto/`), `services/`, `repositories/`, `domain/`. Rules in [`apps/backend/src/modules/README.md`](apps/backend/src/modules/README.md). In short:

- Only repositories touch Prisma, and they return domain types, not Prisma types.
- Domain calculations (capacity, evaluation, price, debt) are pure functions in `domain/`, computed in exactly one place and unit-tested without a database.
- The acting user always comes from the session (`@User() user: Identity`), never from the request body.
- Protect controllers with `@Auth('ORGANIZER')` / `@Auth('PARTICIPANT')` (401 without a session, 403 for the wrong account type). Public endpoints have no decorator.
- Organization data is always filtered by `organizationId`; a foreign record returns 403 with no content. Use `OrganizationAccessService` (`shared/organization-access`) — never hand-roll the check.
- Capacity, evaluation and price come only from `modules/applications/domain` (`capacity.ts`, `evaluation.ts`, `pricing.ts`). Reuse them; don't recompute.
- The worked example module is `modules/account` (`GET /api/me`).
- Money is whole CZK as `Int`.

### Frontend structure

- Shared components follow atomic design: `components/{atoms,molecules,organisms,templates,pages}`, plus vendored shadcn in `components/ui`. A layer imports only from lower layers; `components/` never imports from `features/`. ESLint enforces both. Details: [`apps/frontend/src/components/README.md`](apps/frontend/src/components/README.md).
- Domain code lives in `features/<feature>/{api,hooks,components,lib}`. Features don't import from each other.
- Route files in `src/routes/` stay thin: load data, compose the page. All paths are in `src/app/routes.ts` (`ROUTES`).
- Imports use the `@/` alias; relative imports only for siblings.
- Every server payload is parsed with a zod schema in `features/<feature>/api/`.
- The session user carries `accountType` and `mustSetPassword`. Area layouts guard with `requireAccount` in `beforeLoad`; a wrong account type throws `ForbiddenError` and renders the 403 page.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI puts `shadow-xs`/`shadow-sm` on inputs and textareas. [`DESIGN.md`](DESIGN.md) allows shadows only on cards (`shadow-sm`) and on things that float — dialogs, dropdowns, toasts. Keep them on cards, strip them from inputs, textareas and other controls.

The CLI also has two habits to undo after every `add`: it imports `cn` from the npm package `cn` (rewrite to `import { cn } from "@/lib/utils"`) and adds `cn` to `apps/frontend/package.json` (remove it and restore `pnpm-lock.yaml` from `main`).

### UI follows Figma — don't invent

Screens are designed before they are built, and the frames are linked in the story's issue ("High-fidelity wireframy" first, "Low-fidelity" only when there is no hi-fi). Build what is drawn:

- **Open the frames before writing UI.** Use the Figma MCP — load the `figma:figma-design-to-code` skill, then `get_design_context` for each linked node (mobile 360 px _and_ desktop). Take structure, order of sections, control types, sizes, copy and every drawn state (default, error, sending, empty, invalid link…) from the frames. The returned code is a reference to adapt to our components and tokens, never to paste.
- **Don't invent.** No extra elements, copy, states or layout that the design doesn't show, and don't swap a drawn control for one you prefer (a select stays a select). If something is missing from the design — a state, an error text, where a field goes — stop and ask the designer / tech lead; leave it out meanwhile and say so in the PR.
- **Copy:** the Czech text from Figma goes in verbatim; the English text is a translation of it. Texts the design doesn't contain are not made up — see above.
- **Reuse before restyle:** colours, radii and fonts are already tokens in `global.css`; controls come from `components/ui`, shared pieces from `components/atoms|molecules`. Don't re-draw what the kit has, and don't hardcode what a token has.
- **Figma vs. [`DESIGN.md`](DESIGN.md) / the kit:** when they disagree (a card that isn't a list item, a size or width off the scale) build the frame, and list every such case in the PR — the tech lead decides whether the rule or the design changes ([PROJEKT.md, section 9](docs/PROJEKT.md)). Never silently pick the rule.
- **Mark the source.** The main component of each screen or block carries a comment with the frame name and node URL, so reviewers and the design agent find the spec in the code:
  ```tsx
  // Figma (Design system): V07a Dva účastníci · https://www.figma.com/design/<file>/<name>?node-id=12666-2708
  ```
- **Check before the PR.** Run `@design-reviewer US-<n>` (Claude Code, needs the Figma MCP) on the branch, fix every `MISMATCH`, `EXTRA` and `MISSING`, and paste what remains — plus every `CONFLICT` — into the PR under "Odchylky od Figmy". No Figma access? Say so in the PR instead of guessing the design.

The pre-push review (`@reviewer`) can't open Figma; it only checks that new UI carries the `Figma:` comment and reminds you to run `@design-reviewer`.

### Pull request size

Small PRs, because the tech lead reviews every one quickly. Target: up to ~400 changed lines of code (not counting tests, migration SQL, lockfile, generated files) and ~20 files. If a feature is bigger, split it into vertical slices that each merge on their own and keep `main` working (e.g. 1. migration + repository, 2. service + endpoint, 3. UI), and say in the PR body which part of the story this is (`Refs #23`, „část 1/3“). Agents: plan the split before coding; don't open one big PR. The PR comment „Co se změnilo“ flags oversized PRs.

### Migrations

At most one Prisma migration per PR. Before merging, rebase on `main`; if another migration landed meanwhile, delete yours and regenerate it.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

"The app's ports" are the ones in this checkout's `apps/backend/.env` (`PORT`, `FRONTEND_URL`), not always 3050/4050 — see parallel work below.

### Parallel work (worktrees)

Several stories — and agents — run side by side, each in its own git worktree created by `pnpm wt new <branch>` (`scripts/worktree.mjs`). A worktree lives in `../team-1-wt/<name>` and has its own slot: frontend `3050+10N`, backend `4050+10N`, database `togena_wt<N>` in the shared dev Postgres. The main checkout is slot 0.

- One agent = one worktree = one branch = one story. Don't edit files in another worktree.
- Don't use Claude Code's built-in worktrees (`--worktree`, `.claude/worktrees/`): they get no `.env` and would collide on ports. Create one with `pnpm wt new` and start `claude` inside it.
- Stay inside your stream's folders ([PROJEKT.md, section 6](docs/PROJEKT.md#kdo-sahá-kam-aby-se-proudy-nepraly-o-soubory)); parallel branches touching the same shared file are where merges break.

### Review

The rules a review checks live in one place: the `reviewer` agent ([`.claude/agents/reviewer.md`](.claude/agents/reviewer.md)). The pre-push hook, the scheduled Raspberry Pi review and `@reviewer` all use it. When you add a rule here that a review should enforce, add it to the agent's BLOCKER or WARNING list too — never into a hook or workflow.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.
