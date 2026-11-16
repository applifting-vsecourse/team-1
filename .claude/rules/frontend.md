---
paths:
  - "apps/frontend/**"
  - "DESIGN.md"
---

## Frontend structure

- Shared components follow atomic design: `components/{atoms,molecules,organisms,templates,pages}`, plus vendored shadcn in `components/ui`. A layer imports only from lower layers; `components/` never imports from `features/`. ESLint enforces both. Details: [`apps/frontend/src/components/README.md`](../../apps/frontend/src/components/README.md).
- Domain code lives in `features/<feature>/{api,hooks,components,lib}`. Features don't import from each other.
- Route files in `src/routes/` stay thin: load data, compose the page. All paths are in `src/app/routes.ts` (`ROUTES`).
- Imports use the `@/` alias; relative imports only for siblings.
- Every server payload is parsed with a zod schema in `features/<feature>/api/`.
- The session user carries `accountType` and `mustSetPassword`. Area layouts guard with `requireAccount` in `beforeLoad`; a wrong account type throws `ForbiddenError` and renders the 403 page.

## UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI puts `shadow-xs`/`shadow-sm` on inputs and textareas. [`DESIGN.md`](../../DESIGN.md) allows shadows only on cards (`shadow-sm`) and on things that float — dialogs, dropdowns, toasts. Keep them on cards, strip them from inputs, textareas and other controls.

The CLI also has two habits to undo after every `add`: it imports `cn` from the npm package `cn` (rewrite to `import { cn } from "@/lib/utils"`) and adds `cn` to `apps/frontend/package.json` (remove it and restore `pnpm-lock.yaml` from `main`).

## UI follows Figma — don't invent

Screens are designed before they are built, and the frames are linked in the story's issue ("HF wireframy" first, "LF wireframy" only when there is no hi-fi). Build what is drawn:

- **Open the frames before writing UI.** Use the Figma MCP — load the `figma:figma-design-to-code` skill, then `get_design_context` for each linked node (mobile 360 px _and_ desktop). Take structure, order of sections, control types, sizes, copy and every drawn state (default, error, sending, empty, invalid link…) from the frames. The returned code is a reference to adapt to our components and tokens, never to paste.
- **Don't invent.** No extra elements, copy, states or layout that the design doesn't show, and don't swap a drawn control for one you prefer (a select stays a select). If something is missing from the design — a state, an error text, where a field goes — stop and ask the designer / tech lead; leave it out meanwhile and say so in the PR.
- **Copy:** the Czech text from Figma goes in verbatim; the English text is a translation of it. Texts the design doesn't contain are not made up — see above.
- **Reuse before restyle:** colours, radii and fonts are already tokens in `global.css`; controls come from `components/ui`, shared pieces from `components/atoms|molecules`. Don't re-draw what the kit has, and don't hardcode what a token has.
- **Figma vs. [`DESIGN.md`](../../DESIGN.md) / the kit:** when they disagree (a card that isn't a list item, a size or width off the scale) build the frame, and list every such case in the PR — the tech lead decides whether the rule or the design changes ([PROJEKT.md, section 8](../../docs/PROJEKT.md)). Never silently pick the rule.
- **Mark the source.** The main component of each screen or block carries a comment with the frame name and node URL, so reviewers and the design agent find the spec in the code:
  ```tsx
  // Figma (Design system): V07a Dva účastníci · https://www.figma.com/design/<file>/<name>?node-id=12666-2708
  ```
- **Check before the PR.** Run `@design-reviewer US-<n>` (Claude Code, needs the Figma MCP) on the branch, fix every `MISMATCH`, `EXTRA` and `MISSING`, and paste what remains — plus every `CONFLICT` — into the PR under "Odchylky od Figmy". No Figma access? Say so in the PR instead of guessing the design.

The AI review (`@reviewer`) can't open Figma; it only checks that new UI carries the `Figma:` comment and reminds you to run `@design-reviewer`.
