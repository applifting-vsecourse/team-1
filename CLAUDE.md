# Togena

Registration platform for multi-term events (camps): organizers set up an event with terms, prices and gendered rooms; applicants apply from a public link without an account; each term is evaluated separately into confirmed / waitlisted by free beds per gender; organizers track occupancy, applications and manually recorded payments. School team project (4IT580).

pnpm monorepo with two apps (plus `apps/e2e` — Playwright E2E tests, rules in [`docs/E2E.md`](docs/E2E.md)):

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client.

**Before deciding anything about product behaviour or architecture, read [`docs/PROJEKT.md`](docs/PROJEKT.md).** It records scope, decisions (several deliberately differ from the GitHub issues — section 10), the data model, routes and API paths. When an issue and PROJEKT.md disagree, PROJEKT.md wins; the process and state diagrams of an application in a term win over both ([Business rules and acceptance criteria](#business-rules-and-acceptance-criteria)).

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

**Before redesigning screens in Figma, read [`docs/FIGMA-REMAKE.md`](docs/FIGMA-REMAKE.md)** and follow its patterns, the logo-corner rule and the workflow.

Workflow (branches, PRs, Definition of Done): [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend test:int` — backend integration tests (`*.int-spec.ts`): builds and starts the server against the `togena_test` database; helpers in `apps/backend/src/test/integration/test-api.ts`
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes
- `pnpm e2e test` — Playwright E2E tests (`apps/e2e`): builds and starts its own backend + frontend against a freshly seeded `togena_e2e` database

## Conventions

This file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### Language

Code, database, API paths, page URLs, commit messages and code comments in English. Docs, issues and PR descriptions in Czech.

Everything a user reads — UI copy, e-mails, error messages — is localized English / Czech (English is the default):

- Frontend: never hardcode copy. Add keys to both `apps/frontend/src/i18n/locales/en/<namespace>.json` and `cs/<namespace>.json` (namespace = your feature) and use `useTranslation("<namespace>")`. Keys are type-checked; a test fails when the two languages differ.
- Money and dates: `formatCzk` / `formatDate` from `@/lib`, never `toLocaleString` by hand.
- Backend errors: throw `AppException(status, code)` with a code from `shared/errors/error-code.ts` and add the code to both `errors.json` files. Every error response is `{ statusCode, code, message }`, optionally with `params` (values for `{{placeholders}}` in the translation, 4th argument of `AppException`).
- E-mails: copy for both locales lives in the template; send in `User.locale` / `Application.locale`. Read the request language with `@RequestLocale()`.

### Business rules and acceptance criteria

A story is more than its title. Before writing code, read the story and the business documents it touches.

- **Story:** `gh issue view <n>` — read the acceptance criteria („Akceptační kritéria“), „Kontext“, „Mimo rozsah“ and „Podklady“. What is under „Mimo rozsah“ is not done in this story.
- **Names:** [`docs/SLOVNIK.md`](docs/SLOVNIK.md). Czech text uses the „Pojem“ column, code uses „V kódu“ — nothing third (not „pořadatel“, „turnus“, a bare „účet“).
- **An application in a term** (status, evaluation, waitlist, payment, cancellation, archiving): the process and state diagram in [`docs/procesy/zpracovani-prihlasky/`](docs/procesy/zpracovani-prihlasky/README.md), in the folder of the evaluation mode the story is about (`rucni-vyhodnocovani/` or `automaticke-vyhodnocovani/`; the shared part is duplicated in both, so check both). E-mails to the applicant: [`EMAILY.md`](docs/procesy/zpracovani-prihlasky/EMAILY.md).
- **When sources disagree, the higher one wins:** the process and state diagrams, then the decisions in PROJEKT.md (sections 9 and 10), then `schema.prisma`, then the issue text.
- **Don't guess.** If the story, the documents and the code contradict each other, or a business rule the story needs is written nowhere, don't pick a side silently and don't invent a default. Build what the higher source says; where none decides, leave that part out. List every such case in the PR under „Nejasnosti k byznys pravidlům“: what each source says (file and section), what you did, and the question. An „Otevřená otázka na PO“ still in the issue counts as unresolved.
- **Business questions go to Adam** (product manager, [Aadikk](https://github.com/Aadikk)), who takes them to the client. When a story lacks something or needs asking, don't leave a note to ask him: post one PR comment that tags `@Aadikk` and asks everything open, and link it from „Nejasnosti k byznys pravidlům“. Don't ask the client yourself.
- **Business documents change only when asked.** If the story needs a change in `docs/`, say so in the PR instead of editing it (exception: the journey table in `docs/E2E.md`, see „E2E tests“). Diagrams are edited in the `.yaml` and regenerated ([`docs/procesy/README_generate_py.md`](docs/procesy/README_generate_py.md)), never in the generated `.md` / `.mmd`.

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
- **Figma vs. [`DESIGN.md`](DESIGN.md) / the kit:** when they disagree (a card that isn't a list item, a size or width off the scale) build the frame, and list every such case in the PR — the tech lead decides whether the rule or the design changes ([PROJEKT.md, section 8](docs/PROJEKT.md)). Never silently pick the rule.
- **Mark the source.** The main component of each screen or block carries a comment with the frame name and node URL, so reviewers and the design agent find the spec in the code:
  ```tsx
  // Figma (Design system): V07a Dva účastníci · https://www.figma.com/design/<file>/<name>?node-id=12666-2708
  ```
- **Check before the PR.** Run `@design-reviewer US-<n>` (Claude Code, needs the Figma MCP) on the branch, fix every `MISMATCH`, `EXTRA` and `MISSING`, and paste what remains — plus every `CONFLICT` — into the PR under "Odchylky od Figmy". No Figma access? Say so in the PR instead of guessing the design.

The pre-push review (`@reviewer`) can't open Figma; it only checks that new UI carries the `Figma:` comment and reminds you to run `@design-reviewer`.

### Pull request size

One PR per feature (user story): backend, frontend and tests together on one branch, linked to the story (`Closes #23`, see „Before you open the PR“). Don't split a story by layer (a backend PR and a frontend PR) or into „část 1/2“ parts. Keep the PR reviewable — aim for ~400 changed lines of code (not counting tests, migration SQL, lockfile, generated files) and ~20 files; when a story needs more, keep it in one PR and say in the PR body why it's bigger. The PR comment „Co se změnilo“ flags large PRs.

### E2E tests

Only the core journeys listed in [`docs/E2E.md`](docs/E2E.md) get an E2E test (`apps/e2e`); everything else is a unit, API (`*.int-spec.ts`) or component test. When a story completes a journey from that list, add or enable its test in the same PR. Locators by role / label / text, English copy, no `waitForTimeout`, every test independent of the others.

### Stay in the story's scope

Build what the acceptance criteria ask and nothing else: no extra features, refactors, renames, dependency bumps, restyling or „když už jsem tady“ fixes, and nothing from „Mimo rozsah“. Something outside the scope that you notice goes into the PR as a one-line note under „Mimo rozsah story“ — suggest a follow-up issue, don't create it.

When a demo is near (the user or the tech lead says so), the bar is higher: only changes that make an acceptance criterion pass. Don't touch the seed or the demo data (`apps/backend/src/scripts/seed/seed/sprint-demo-data.ts`, the demo accounts in [`CONTRIBUTING.md`](CONTRIBUTING.md)) — the demo and the E2E tests stand on them — and don't add migrations, dependencies or shared-file changes beyond what the story needs. A risky change the story doesn't need is a proposal in the PR, not a commit.

### Before you open the PR

Go through the acceptance criteria once more and compare them with what you built. In the PR body, under „Akceptační kritéria“, list each one as `✅ splněno — <test or file that shows it>`, `❌ nesplněno — <why>` or `❓ nelze ověřit — <what is missing>`. A criterion is met only when a test or a manual step you describe shows it. While any is ❌ or ❓, leave the matching PR-template checkbox unticked and write what is missing.

Then tell the author what the PR still lacks — a short list in your last message, before the PR is opened and whenever it is updated:

- **E2E test:** the story completes or changes a journey from the table in [`docs/E2E.md`](docs/E2E.md), but `apps/e2e` has no new or enabled test for it (rules in „E2E tests“; a changed UI text that a locator uses means a changed test; run `pnpm e2e test`). If no listed journey is touched, say „žádná cesta z docs/E2E.md se nemění“ and don't add an E2E test.
- **Ticket link:** the branch is `feat/US-<n>-<slug>` (`fix/`, `chore/`, `docs/` for the rest), the PR title is the story title and every PR that belongs to an issue starts its body with `Closes #<issue number>`. `Refs` doesn't link the PR and the issue in GitHub. On merge, the issue closes and the board's „Item closed“ workflow moves it to In Business Review; the product manager moves it to Done after checking it on staging.
- **Acceptance criteria:** the report above is in the PR body and every ✅ one is ticked in the issue on the board. Tick them yourself with `gh issue edit <n> --body-file` when you open or update the PR, and change nothing else in the issue. Leave ❌ and ❓ unticked.
- **Open items:** „Nejasnosti k byznys pravidlům“, „Odchylky od Figmy“ and „Mimo rozsah story“ are in the PR when they apply.

### Migrations

At most one Prisma migration per PR. Before merging, rebase on `main`; if another migration landed meanwhile, delete yours and regenerate it.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

"The app's ports" are the ones in this checkout's `apps/backend/.env` (`PORT`, `FRONTEND_URL`), not always 3050/4050 — see parallel work below.

### Parallel work (worktrees)

Several stories — and agents — run side by side, each in its own git worktree created by `pnpm wt new <branch>` (`scripts/worktree.mjs`). A worktree lives in `../team-1-wt/<name>` and has its own slot: frontend `3050+10N`, backend `4050+10N`, database `togena_wt<N>` in the shared dev Postgres. The main checkout is slot 0.

- One agent = one worktree = one branch = one story. Don't edit files in another worktree.
- Don't use Claude Code's built-in worktrees (`--worktree`, `.claude/worktrees/`): they get no `.env` and would collide on ports. Create one with `pnpm wt new` and start `claude` inside it.
- Parallel branches touching the same shared file (`schema.prisma`, `app.module.ts`, `routes.ts`, `components/*`) are where merges break. Change them only as far as your story needs, mention it in the PR and coordinate with the team ad hoc ([PROJEKT.md, section 11](docs/PROJEKT.md#11-pracovní-postup)).

### Review

The rules a review checks live in one place: the `reviewer` agent ([`.claude/agents/reviewer.md`](.claude/agents/reviewer.md)). The pre-push hook, the Raspberry Pi review of every PR push and `@reviewer` all use it. When you add a rule here that a review should enforce, add it to the agent's BLOCKER or WARNING list too — never into a hook or workflow.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.
