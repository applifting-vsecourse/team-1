---
name: pr-finish
description: Finish a pull request in team-1 — report the acceptance criteria, list what the PR still lacks, add screenshots when the UI changes, then run the Codex review loop and answer it. Use before opening a PR, when marking it ready, after every push, and whenever asked what a PR still lacks.
---

The rules that always apply are in `CLAUDE.md` („Pull requests“). This is the procedure, in order. `/story <issue> finish` calls it.

## 1. Acceptance criteria

Go through the acceptance criteria once more and compare them with what you built. In the PR body, under „Akceptační kritéria“, list each one as `✅ splněno — <test or file that shows it>`, `❌ nesplněno — <why>` or `❓ nelze ověřit — <what is missing>`. A criterion is met only when a test or a manual step you describe shows it. While any is ❌ or ❓, leave the matching PR-template checkbox unticked and write what is missing.

## 2. What the PR still lacks

Tell the author in a short list in your last message, before the PR is opened and whenever it is updated:

- **E2E test:** the story completes or changes a journey from the table in `docs/E2E.md`, but `apps/e2e` has no new or enabled test for it (rules in `CLAUDE.md`, „E2E tests“; a changed UI text that a locator uses means a changed test; run `pnpm e2e test`). If no listed journey is touched, say „žádná cesta z docs/E2E.md se nemění“ and don't add an E2E test.
- **Ticket link:** the branch is `feat/US-<n>-<slug>` (`fix/`, `chore/`, `docs/` for the rest), the PR title is the story title and every PR that belongs to an issue starts its body with `Closes #<issue number>`. `Refs` doesn't link the PR and the issue in GitHub. On merge, the issue closes and the board's „Item closed“ workflow moves it to In Business Review; the product manager moves it to Done after checking it on staging.
- **Acceptance criteria:** the report above is in the PR body and every ✅ one is ticked in the issue on the board. Tick them yourself with `gh issue edit <n> --body-file` when you open or update the PR, and change nothing else in the issue. Leave ❌ and ❓ unticked.
- **Open items:** „Nejasnosti k byznys pravidlům“, „Odchylky od Figmy“ and „Mimo rozsah story“ are in the PR when they apply.
- **Screenshots:** the PR changes what a user sees, but „Screenshoty“ has neither pictures nor a line saying why there are none (step 3).

## 3. Screenshots

When a PR changes what a user sees and a picture saves the reviewer a click — a new or changed screen, a drawn state, a layout or visual fix — put screenshots in the PR body under „Screenshoty“: desktop and 360 px, before and after for a visual fix. Skip them for backend-only, refactoring or test-only changes and for copy tweaks that the diff already shows; a screen that seed data can't reach gets a one-line note instead.

- **Take them headless with Playwright in `apps/e2e`.** Write a throwaway spec (`apps/e2e/tests/zz-screenshots.spec.ts`, never committed) that signs in with `signIn` from `tests/support/auth.ts`, opens the screen, waits until it has loaded (an `expect` on a heading or the URL, then `waitForLoadState("networkidle")`) and calls `page.screenshot({ path: "test-results/screenshots/<name>.png", fullPage: true })`; for 360 px use `test.use({ viewport: { width: 360, height: 800 } })`. Run it with `pnpm e2e test tests/zz-screenshots.spec.ts --project=desktop` — it builds and seeds its own app, so it doesn't touch the running dev servers — then delete the spec. This is the one case where an agent opens the app on its own: screenshots illustrate the change, the tests are still the evidence.
- **Seed data only.** The repo is public; no real names, e-mails or other personal data in a picture.
- **Upload to the `pr-screenshots` branch, never to the PR branch** (a squash merge would put the images on `main`). One folder per PR, a new file name instead of overwriting:
  ```sh
  base64 -i <name>.png -o <name>.b64        # Linux: base64 -w0 <name>.png > <name>.b64
  gh api -X PUT repos/applifting-vsecourse/team-1/contents/<pr>/<name>.png \
    -f message="Screenshots for #<pr>" -f branch=pr-screenshots -F content=@<name>.b64
  ```
  Then embed `![<what it shows>](https://raw.githubusercontent.com/applifting-vsecourse/team-1/pr-screenshots/<pr>/<name>.png)` with a caption saying which screen, state and width it is.
- If taking or uploading them is blocked or fails, say so in one line under „Screenshoty“ and go on; screenshots never hold a PR back.

## 4. Review loop

Open the PR as a draft (`gh pr create --draft`) and run `gh pr ready` when the work is finished: Codex reviews a PR once it is ready.

An agent working on a PR doesn't stop at green CI. After every push, run `node scripts/pr-review.mjs wait <pr>` in the background: it waits for the Codex review of that exact commit (asking for one with `@codex review` when none comes), prints its findings and ends with a verdict (`REVIEWED`, `ANSWERED`, `CLEAN`, `FAILED`, `SKIPPED`, `TIMEOUT`). On `FAILED`, `SKIPPED` or `TIMEOUT` no review exists, so tell the author. Also read „Co se změnilo“ from `github-actions` (`gh pr view <n> --comments`). The Codex review is not a check, so green CI doesn't mean a clean review. Fix what the review rightly finds and push again, then read the new review too.

Then answer it, so everyone can see that nothing was ignored. Post a new PR comment in Czech (`gh pr comment`), starting with the line `<!-- ai-review-answer: <sha> -->` (the 7-character reviewed commit), that goes through every finding (`P0`, `P1`) of the latest review and every „Pozor“ from „Co se změnilo“, each as `opraveno v <commit>` or `neopravuji — <důvod>`. A later review with new findings gets its own answer. With no findings, no answer is needed (a „Pozor“ still needs one). A Stop hook (`.claude/settings.json`) holds an agent back once when the head commit's review is still running or has findings without that answer.
