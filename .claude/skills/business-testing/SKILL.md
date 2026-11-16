---
name: business-testing
description: Business (acceptance) testing of a user story or feature against the real codebase and the issue board. Use when the user says they are testing a story/feature (e.g. "testuju US-xx"), asks whether a feature exists, who owns it, or what state it is in. Answers from facts in code, git and GitHub, not from assumptions.
---

# Business testing user story

Goal: tell the tester (usually the product manager) what **actually works** versus what only looks done on the board. Answer in the user's language (Czech by default), short and factual.

## Steps

1. **Find the story's spec.** Search the repo for the story ID (`grep -rIli "US-xx"` excluding node_modules/build dirs). Read the project doc (e.g. `docs/PROJEKT.md`) and the decision register `docs/rozhodnuti/README.md`: acceptance criteria, owner/stream, dependencies, and any table of "board says vs. what applies".
2. **Map the story to its trigger chain.** Write down the real-world flow the story belongs to (e.g. form submitted -> saved -> account created -> e-mail sent -> link opens). Every link of the chain is a separate thing to verify, often owned by a different story.
3. **Verify each link in code, not by file names.**
   - Backend: controllers and routes (`@Post`, `@Get`), module `controllers`/`providers`.
   - Frontend: which API call the UI makes, and whether the endpoint it targets exists.
   - Services that are defined and exported but **never called** (grep for the class name outside its own file/spec/module). This is the classic "built but not wired" gap.
   - Comments like "saving is US-xx" point to the missing piece.
4. **Check the board and git** (`gh`, if available):
   - `gh issue list --search "US-xx in:title" --state all --json number,title,state,assignees,labels`
   - `gh pr list --state all --search "US-xx" --json number,title,state,author,headRefName` and open PRs
   - `git branch -r | grep -i xx` for unmerged work
   - `gh issue view N --json comments` for blockers ("blocked by"), spec changes and who said what.
   - Board column is not always readable via `gh`; say so instead of guessing.
5. **Decide what can be tested and how.** Separate: (a) end-to-end through the UI - possible only if the whole chain exists; (b) isolated - integration/e2e specs and seed data that create the state directly. Name the spec files.
6. **Report.** Short and scannable; the tester must not wade through text.
   - Header: ticket title with a link to the issue (full URL, e.g. from `gh issue view N --json url`), plus links to the PR(s).
   - Then 2-3 sentences in plain business language: what the ticket is supposed to do for the user/organizer (the goal and the visible result, not implementation or file names).
   - First line of the verdict: one-sentence verdict (exists / partly / missing) with PR number and state.
   - Things in ideal state: one line each with ✅ and a few words (e.g. "design sedí ✅"). No evidence paragraphs, no file lists.
   - Then **only what is missing, broken or unverified**, each one line: ❓ not verified, ⚠️ inconsistency or open item (registers, Figma deviations, unticked criteria/checklist), ❌ missing. Say what exactly and why it matters.
   - **Test now:** 3-5 short steps for what can be tried today; name what cannot be tested.
   - One line of uncertainty (e.g. board column not visible via `gh`).
   - End with one short follow-up offer.
   - Aim for roughly 15-20 lines. Put file paths and long evidence only when asked.

## Rules

- Read-only: do not change code, issues or the board unless asked.
- Never say "done" because the board column or the service file exists; confirm it is reachable from the user-facing flow.
- Distinguish a story that is missing from one that is merely blocked by another.
- State uncertainty explicitly (e.g. "board column not visible to me").
- Do not use the owner's name inferred from elsewhere; take assignees from the issue/doc.
