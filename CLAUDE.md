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
- `/story <issue>` / `/story <issue> finish` — start a story from the board / take it through the PR (`.claude/skills/story/SKILL.md`)
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
- Czech copy always addresses the user formally (vykání), even where a Figma frame uses tykání — tech-lead decision.

### Business rules and acceptance criteria

A story is more than its title. Before writing code, read the story and the business documents it touches.

- **Story:** `gh issue view <n>` — read the acceptance criteria („Akceptační kritéria“), „Kontext“, „Mimo rozsah“, „Podklady“, „Dokumenty“ and „Závislosti“. What is under „Mimo rozsah“ is not done in this story.
- **Names:** [`docs/SLOVNIK.md`](docs/SLOVNIK.md). Czech text uses the „Pojem“ column, code uses „V kódu“ — nothing third (not „pořadatel“, „turnus“, a bare „účet“).
- **An application in a term** (status, evaluation, waitlist, payment, cancellation, archiving): the process and state diagram in [`docs/procesy/zpracovani-prihlasky/`](docs/procesy/zpracovani-prihlasky/README.md), in the folder of the evaluation mode the story is about (`rucni-vyhodnocovani/` or `automaticke-vyhodnocovani/`; the shared part is duplicated in both, so check both). E-mails to the applicant: the catalogue [`docs/emaily/KATALOG.md`](docs/emaily/KATALOG.md).
- **When sources disagree, the higher one wins:** the process and state diagrams, then the decisions in the register [`docs/rozhodnuti/`](docs/rozhodnuti/README.md), then `schema.prisma`, then the issue text.
- **Don't guess.** If the story, the documents and the code contradict each other, or a business rule the story needs is written nowhere, don't pick a side silently and don't invent a default. Build what the higher source says; where none decides, leave that part out. List every such case in the PR under „Nejasnosti k byznys pravidlům“: what each source says (file and section), what you did, and the question. An „Otevřená otázka na PO“ still in the issue counts as unresolved.
- **Business questions go to Adam** (product manager, [Aadikk](https://github.com/Aadikk)), who takes them to the client. When a story lacks something or needs asking, don't leave a note to ask him: post one PR comment that tags `@Aadikk` and asks everything open, and link it from „Nejasnosti k byznys pravidlům“. Don't ask the client yourself.
- **Business documents change only when asked.** If the story needs a change in `docs/`, say so in the PR instead of editing it (exception: the journey table in `docs/E2E.md`, see „E2E tests“). Diagrams are edited in the `.yaml` and regenerated ([`docs/procesy/README_generate_py.md`](docs/procesy/README_generate_py.md)), never in the generated `.md` / `.mmd`.

### E-mails

Any work touching e-mails — a template in `apps/backend/src/core/email/`, the code that sends one, a trigger, a recipient, copy, layout or footer — starts with [`docs/emaily/AGENTI.md`](docs/emaily/AGENTI.md). The business catalogue ([`docs/emaily/KATALOG.md`](docs/emaily/KATALOG.md)) decides which message goes to whom and when, [`TEXTY.md`](docs/emaily/TEXTY.md) holds the approved copy and Figma holds the layout. A message that is not in the catalogue is not approved: don't build it, report the gap in the PR (see „Business rules and acceptance criteria“).

### Pull request size

One PR per feature (user story): backend, frontend and tests together on one branch, linked to the story (`Closes #23`, see „Pull requests“). Don't split a story by layer (a backend PR and a frontend PR) or into „část 1/2“ parts. Keep the PR reviewable — aim for ~400 changed lines of code (not counting tests, migration SQL, lockfile, generated files) and ~20 files; when a story needs more, keep it in one PR and say in the PR body why it's bigger. The PR comment „Co se změnilo“ flags large PRs.

### Path-scoped rules

Rules tied to one part of the repo live in [`.claude/rules/`](.claude/rules/) and load when you work on matching files: [`backend.md`](.claude/rules/backend.md) (`apps/backend`), [`frontend.md`](.claude/rules/frontend.md) (`apps/frontend`, `DESIGN.md`: structure, UI controls from the kit, UI follows Figma) and [`e2e.md`](.claude/rules/e2e.md) (`apps/e2e`).

### E2E tests

Only the core journeys listed in [`docs/E2E.md`](docs/E2E.md) get an E2E test (`apps/e2e`); everything else is a unit, API (`*.int-spec.ts`) or component test. When a story completes a journey from that list, add or enable its test in the same PR. Writing rules: [`e2e.md`](.claude/rules/e2e.md).

### Stay in the story's scope

Build what the acceptance criteria ask and nothing else: no extra features, refactors, renames, dependency bumps, restyling or „když už jsem tady“ fixes, and nothing from „Mimo rozsah“. Something outside the scope that you notice goes into the PR as a one-line note under „Mimo rozsah story“ — suggest a follow-up issue, don't create it.

When a demo is near (the user or the tech lead says so), the bar is higher: only changes that make an acceptance criterion pass. Don't touch the seed or the demo data (`apps/backend/src/scripts/seed/seed/sprint-demo-data.ts`, the demo accounts in [`CONTRIBUTING.md`](CONTRIBUTING.md)) — the demo and the E2E tests stand on them — and don't add migrations, dependencies or shared-file changes beyond what the story needs. A risky change the story doesn't need is a proposal in the PR, not a commit.

### Pull requests

Open the PR as a draft (`gh pr create --draft`) and run `gh pr ready` when the work is finished: Codex reviews a PR once it is ready. The branch is `feat/US-<n>-<slug>` (`fix/`, `chore/`, `docs/` for the rest), the PR title is the story title and every PR that belongs to an issue starts its body with `Closes #<issue number>` (`Refs` doesn't link them).

Run the `pr-finish` skill before opening a PR, when marking it ready and after every push ([`.claude/skills/pr-finish/SKILL.md`](.claude/skills/pr-finish/SKILL.md)). The rules it carries out:

- **Acceptance criteria:** list each one in the PR body under „Akceptační kritéria“ as ✅ / ❌ / ❓ with the test or file that shows it, and tick the ✅ ones in the issue. A criterion is met only when a test or a described manual step shows it.
- **What the PR still lacks:** tell the author in your last message — E2E test (journey from [`docs/E2E.md`](docs/E2E.md)), ticket link, criteria, open items („Nejasnosti k byznys pravidlům“, „Odchylky od Figmy“, „Mimo rozsah story“) and screenshots.
- **Screenshots:** a PR that changes what a user sees gets them under „Screenshoty“ (desktop and 360 px, before / after for a fix), taken headless from seed data and uploaded to the `pr-screenshots` branch, never to the PR branch.
- **Review:** after every push wait for the Codex review (`node scripts/pr-review.mjs wait <pr>`) and answer every finding and every „Pozor“ in a PR comment starting with `<!-- ai-review-answer: <sha> -->`.

### Migrations

At most one Prisma migration per PR. Before merging, rebase on `main`; if another migration landed meanwhile, delete yours and regenerate it.

At most one story changing `schema.prisma` in progress at a time. Before starting one, check that no open PR or other worktree changes the schema; if one does, take another story or wait.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

"The app's ports" are the ones in this checkout's `apps/backend/.env` (`PORT`, `FRONTEND_URL`), not always 3050/4050 — see parallel work below.

### Parallel work (worktrees)

Several stories — and agents — run side by side, each in its own git worktree created by `pnpm wt new <branch>` (`scripts/worktree.mjs`). A worktree lives in `../team-1-wt/<name>` and has its own slot: frontend `3050+10N`, backend `4050+10N`, database `togena_wt<N>` in the shared dev Postgres. The main checkout is slot 0.

- One agent = one worktree = one branch = one story. Don't edit files in another worktree.
- Don't use Claude Code's built-in worktrees (`--worktree`, `.claude/worktrees/`): they get no `.env` and would collide on ports. Create one with `pnpm wt new` and start `claude` inside it.
- Parallel branches touching the same shared file (`schema.prisma`, `app.module.ts`, `routes.ts`, `components/*`) are where merges break. Change them only as far as your story needs, mention it in the PR and coordinate with the team ad hoc ([PROJEKT.md, section 11](docs/PROJEKT.md#11-pracovní-postup)).

### Review

The rules a review checks live in one place: the `reviewer` agent ([`.claude/agents/reviewer.md`](.claude/agents/reviewer.md)). `@reviewer` runs it, and the Codex code review of every PR reads its BLOCKER and WARNING lists through [`AGENTS.md`](AGENTS.md). When you add a rule here that a review should enforce, add it to the agent's BLOCKER or WARNING list too — never into `AGENTS.md`, a hook or a workflow.

An agent working on a PR doesn't stop at green CI: the Codex review is not a check. The loop (wait for the review, fix, answer) is in the `pr-finish` skill, step 4; a Stop hook (`.claude/settings.json`) holds an agent back once when it is not finished.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative. The exception is taking screenshots for the PR, headless and as the `pr-finish` skill describes.
