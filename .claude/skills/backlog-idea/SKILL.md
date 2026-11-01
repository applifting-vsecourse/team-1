---
name: backlog-idea
description: Turn a rough thought about the Togena product (team-1) into a reasoned backlog idea — description, basic elaboration, conflicts with existing decisions/issues and follow-up questions. Use when the user throws a raw idea ("mám nápad", "hodím ti myšlenku", "nápad do backlogu") and wants it worked out, not written as a full user story.
---

# Backlog idea

The user gives a rough thought. You turn it into an **idea**, not a user story: no acceptance criteria, no implementation plan. Output is Czech, as a plain message in the terminal (no artifact, no file) unless asked.

## Before writing

Read what the idea touches, don't guess:

- `docs/PROJEKT.md` (scope, data model, routes, API) and `docs/rozhodnuti/README.md` (the decision register)
- `docs/SLOVNIK.md` — use the „Pojem“ column in Czech text; never „pořadatel“, „turnus“, a bare „účet“
- `docs/procesy/zpracovani-prihlasky/` if the idea touches an application in a term (status, evaluation, waitlist, payment, cancellation, archiving); check both evaluation-mode folders
- open and closed issues on the board: `gh issue list --repo applifting-vsecourse/team-1 --state all --search "<keywords>"` (see the `team1-github` skill for connecting); `gh issue view <n>` for candidates

If the thought lacks something essential (who it is for, what problem it solves), ask first and don't fill it in.

## Output structure

1. **Myšlenka** — the idea in your own words, 2–3 sentences, so the user can see at once if you misread it.
2. **Popis nápadu** — what it is, for whom (SLOVNIK terms), which problem it solves.
3. **Základní rozpracování** — where it would show up: application flow, data model, API, UI. Rough map only, not a solution design.
4. **Konflikty a souvislosti** — against the decisions in `docs/rozhodnuti/`, the process/state diagrams, „Mimo rozsah“ of existing stories, and open issues that overlap or duplicate. Every item cites its source (file and section, or issue number). If there is none, say „žádný konflikt nenalezen“ and what you checked.
5. **Navazující otázky** — split into: _rozhodne zadavatel nápadu_ and _byznys otázky_ (each starts „Dotaz na Adama:“; business questions go to Adam, who takes them to the client). Do not answer them for the user, and don't invent defaults for unwritten business rules.
6. **Velikost a závislosti** — one sentence: small tweak, standalone story, or epic; what it depends on.

## Rules

- Business documents change only when asked; if the idea needs a change in `docs/`, say so under the conflicts.
- Don't create an issue, edit docs or write code on your own. After the output, offer: „Založit jako issue?“. On a yes, create it through `team1-github` with the idea label (check which labels exist), a Czech body in the structure above, and no `Closes`.
- Stay honest about certainty: separate what you verified in the sources from what you infer.
