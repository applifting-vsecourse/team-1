# Design contract

Read this before writing or changing any UI — human or agent.

These are rules, not suggestions. When a rule and a "nicer looking" idea disagree, the rule wins. Consistency across every screen beats a clever one.

`src/components/ui/**` is vendored shadcn — treat it as a third-party kit and restyle via tokens rather than rewriting it.

## Screens come from Figma

This file says how to build; **Figma says what to build.** Every UI story links its frames in the issue, and the screen is implemented as drawn — structure, copy, control types, sizes, states. The rules below fill in only what a frame doesn't spell out (spacing scale, accessibility floor, three list states); they never license redesigning a screen or adding what the design doesn't contain. Process and the `design-reviewer` agent: [`CLAUDE.md`, "UI follows Figma"](CLAUDE.md#ui-follows-figma--dont-invent).

When a frame contradicts a rule below, build the frame and report the conflict in the PR; the tech lead decides which one changes. Decided so far (US-23): public pages are 800 px wide, and type stays on the Tailwind scale even where a frame is a few px off it (the "404" is `text-6xl`, not 64 px).

**Visual style: shadcn look on the original colours.** The frames in the original Figma file are redrawn in the shadcn style ([`docs/FIGMA-REMAKE.md`](docs/FIGMA-REMAKE.md)): original DS colours, cards with a soft shadow, Inter (numbers in JetBrains Mono). The two logo arcs (`ActiveCorners`) mark one active thing — the active sidebar item, the active tab, the current step, the current event card — and nothing else: never rows, controls, badges, buttons, hover or empty states.

**Tokens live in `apps/frontend/src/styles/global.css`.** That file is the only source of truth for colour, radius and shadows. This file says how to _use_ them.

## Colour

- **Never hardcode a colour.** No `#hex`, no `bg-blue-500`, no `rgb()`. Use the semantic classes only: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-primary`, `bg-secondary`, `border-border`, `bg-destructive`.
- **`primary` is for actions, not decoration.** One primary button per view. Everything else is `outline`, `ghost` or a plain link.
- **`destructive` only for destructive actions and errors.** Never for emphasis.
- **`accent` is a quiet teal tint, not a brand colour.** It marks badges, icon tiles, the active tab and hover surfaces. The brand colour is `primary`; `link` is the teal for text links and accented words.
- Body text is `foreground`; supporting text is `muted-foreground`. There is no third level.

## Layout

- **Cards group a section or an item of a list** — an event in a list, "Your account" on a settings page, the sign-in form, a feature on the landing. Card = `bg-card`, hairline border, `rounded-lg`, `shadow-sm`, padding 24 (list items 20 top and bottom); its heading is an `h2`. Cards are not a layout tool: no card for a whole page, no card just to add a box.
- **Never nest a card inside a card.** If content needs grouping inside a card, use spacing and a hairline divider (a top border on the row).
- **A page is not a card.** Page content sits on `background` in a column (`max-w-196` = 784 px for forms and settings, full width for overviews, `max-w-200` = 800 px for the application form in `PublicLayout`); the cards sit in that column.
- **Every page keeps the app chrome.** The header is present on every route, including login and sign-up. Pages never render as standalone islands.
- The landing is a centred hero (primary words, two XL buttons) followed by a `muted` band with a 2x2 grid of feature cards; its two buttons are `lg`. Elsewhere, carousels, decorative illustrations or gradients, and any section whose only purpose is to look full are forbidden.
- Signed-in areas: sidebar 240 px (`sidebar` tokens, nav items 44 px without borders; the Figma support link waits until a support channel exists), the account (avatar, name, e-mail; its menu opens upwards) at the bottom of the sidebar, top bar 64 px (role label, language and theme switchers), content padding 32. Below `md` the sidebar moves into a sheet opened from the top bar (56 px: menu, logo, language and theme), the account stays at the bottom of the sheet.

## Spacing

Use the scale only: `1, 2, 3, 4, 6, 8, 12, 16` (Tailwind units — 4px…64px). No arbitrary values like `p-[13px]`. Related things get `gap-2`/`gap-3`; separate blocks get `gap-6`/`gap-8`.

## Type

- One `h1` per page. Headings step down without skipping.
- Sizes come from the scale: `text-sm` supporting, `text-base` body, `text-lg`/`text-xl` subheads, `text-2xl`+ page titles. Body does not.
- Inter everywhere; numbers that line up (counts, amounts) may use `font-mono` (JetBrains Mono). Headings use `tracking-tight`.
- Sentence case everywhere. No ALL CAPS except a single small label style (`text-xs uppercase tracking-wider`, e.g. the role in the top bar), used sparingly.

## Surfaces

- **Borders are hairlines**: `border border-border`. One border, not two adjacent ones.
- **Shadows are for cards and things that float** — `shadow-sm` on cards, `shadow-md` on dropdowns, dialogs and toasts. Inputs, buttons, badges and nav items do not get shadows.
- Radius comes from the token (DS scale 4 / 8 / 12 / 20): `rounded-lg` cards, alerts and floating menus, `rounded-md` buttons, inputs and nav items, `rounded-sm` menu items, `rounded-full` badges and avatars. Never mix radii in one component.

## Forms

- Heights come from the kit: `Button` default 40, `lg` 44; `Input` and `Select` 44. Page and form actions are `lg` (44), so they line up with inputs; `xl` is not used. Don't override heights per screen.
- Every input has a visible `<label>`. Placeholders are examples, never labels.
- Validation runs client-side _and_ server-side. The client message appears under the field.
- The submit button shows a pending state and is disabled while submitting.
- Never disable a submit button just because the form is untouched — let the user try and show them what's wrong.

## Toasts and alerts

All toasts go through `notify` (`@/lib/notify`) — never `toast` from `sonner` directly. Tones Success, Info, Warning, Error; bottom right; Success and Info disappear after 4 s, Warning and Error after 8 s. Component: DS / Toast in Figma.

- **Toast**: confirmation of a finished action after which the dialog closes or the page changes (create, save, add, delete, copy link); an error of an action that has no form of its own (delete from a row menu, copy to clipboard failed). Short: the title is the result of the action, a description only when it adds information. No buttons or links. Never carries information the user needs for the next step.
- **Alert in the page**: a form submission error (validation, server error) — it stays above the submit button until fixed; the state of the whole page (link sent, invalid link, what is missing to publish). A form that stays open shows its error with an Alert, not a toast.
- Server errors are always shown as a translated message by error code (`errors.json`), never the raw message (`notify.serverError`).

## Every list has three states

Loading, empty, and error — all three, always. An empty list renders an empty state with one sentence saying what would appear here, not a blank area. An error renders the message and a way to retry.

Data refreshes itself: refetch when the tab regains focus, and invalidate the query after a mutation. A manual "reload" button in normal UI means one of those is missing — retry belongs in the error state only.

## Accessibility (the floor, not the ceiling)

- Buttons are `<button>`, links are `<a>`/`<Link>`. Never a `div` with `onClick`.
- Every icon-only control has an `aria-label`.
- Focus rings are never removed. If you restyle focus, it must stay clearly visible.
- Text contrast at least 4.5:1 — the tokens are chosen to satisfy this; hardcoded colours are how you break it.

## When you are unsure

Prefer less: fewer borders, fewer boxes, fewer font sizes, more whitespace. If a screen feels plain, the fix is usually better spacing and clearer hierarchy, not another container.

## Extending this file

When a code review keeps repeating the same UI feedback, add it here as a rule. That is the point of the file: expectations live in the repo, not in someone's head.
