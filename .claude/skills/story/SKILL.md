---
name: story
description: Start a user story from the board, or finish it into a PR. `/story <issue>` checks it is ready, claims it and sets up the worktree; `/story <issue> finish` takes the finished work through the PR. Use when asked to build, take or finish a story.
argument-hint: "<issue> [finish]"
---

Arguments: `$ARGUMENTS`. `<issue>` is the GitHub issue number, not the US number: US-99 is issue #192. The rules are in `CLAUDE.md`; this is only their order.

## Start: `/story <issue>`

1. Run `node scripts/story.mjs check <issue>`. On `VERDICT: NOT READY`, report the reasons and stop. Go on only if the user says so.
2. Read the story with `gh issue view <issue>`, then its comments with `gh issue view <issue> --comments`: decisions often live there, and `--comments` alone leaves out the body.
3. Claim it: `gh issue edit <issue> --add-assignee @me`, then `node scripts/story.mjs move <issue> "In progress"`.
4. Unless you are already in its worktree, run `pnpm wt new <branch>` with the branch from step 1. Work there, with absolute paths.
5. Read only what the story needs:
   - the files in its „Dokumenty“ section; for an older issue without it, the `CLAUDE.md` section „Business rules and acceptance criteria“ decides,
   - `docs/PROJEKT.md` and `docs/SLOVNIK.md`: Grep the term and read that section, not the whole file,
   - with UI: `DESIGN.md` and the frames from „Podklady“, following `CLAUDE.md`, „UI follows Figma“.
6. Build it. What is under „Mimo rozsah“ or in another open issue stays out.

## Finish: `/story <issue> finish`

1. Run `pnpm check-all`. Fix what fails.
2. With UI: run `@design-reviewer` and fix every `MISMATCH`, `EXTRA` and `MISSING`.
3. Go through `CLAUDE.md`, „Before you open the PR“: report each acceptance criterion, and add the E2E test if the story needs one.
4. Commit, push, and open the PR with `gh pr create --draft`, body starting with `Closes #<issue>`.
5. Tick the ✅ criteria in the issue, then run `gh pr ready <pr>` and `node scripts/story.mjs move <issue> "Code review"`.
6. Wait with `gh pr checks <pr> --watch`, read the `github-actions` comments and answer them as `CLAUDE.md`, „Review“ says.
7. When CI is green and the review answered, run `node scripts/story.mjs move <issue> "In Test"`.

End with what the PR still lacks, as „Before you open the PR“ asks. Don't merge.
