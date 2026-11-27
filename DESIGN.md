# Design contract

Read this before writing or changing any UI — human or agent.

These are rules, not suggestions. When a rule and a "nicer looking" idea disagree, the rule wins. Consistency across every screen beats a clever one.

`src/components/ui/**` is vendored shadcn — treat it as a third-party kit and restyle via tokens rather than rewriting it.

## Screens come from Figma

Use the verified v2 frames under **Podklady** in the issue. Follow each screen’s interaction notes and the [Motion M01–M30 guide](https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=26793-3466) (brand motion M31 / M32: [`27363:3600`](https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27363-3600)) for triggers, timing, results and reduced motion. Apply conditional effects only when their stated condition is met. Keep controls, results and errors available immediately. For interactions without a specified effect, update the state immediately.

This file says how to build; **Figma says what to build.** Every UI story links its frames in the issue, every PR that changes UI links the same frames under „Design“ next to its screenshots, and the screen is implemented as drawn — structure, copy, control types, sizes, states. The rules below fill in only what a frame doesn't spell out (spacing scale, accessibility floor, three list states); they never license redesigning a screen or adding what the design doesn't contain. Process and the `design-reviewer` agent: [`CLAUDE.md`, "UI follows Figma"](CLAUDE.md#ui-follows-figma--dont-invent).

When a frame contradicts a rule below, build the frame and report the conflict in the PR; the tech lead decides which one changes. Decided so far (US-23): public pages are 800 px wide, and type stays on the Tailwind scale even where a frame is a few px off it (the "404" is `text-6xl`, not 64 px).

**Visual style: the Togena brand, direction A „Ink and a hard shadow“** (approved 2026-11-27; [proposal](https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27533-3722), [component specimen](https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27535-3692)). Every control and card has a 1 px ink edge; what you can press lifts on hover onto a hard ink offset shadow and settles back when pressed — the same language as the „Potvrzeno“ sticker. References: [Gumroad](https://gumroad.com/login) (1 px black edge, hover lift with a hard shadow, press settles; [source](https://github.com/antiwork/gumroad)) and [Mailchimp](https://mailchimp.com/pricing/marketing) (ink outline, brand colour as a surface with dark text). Original DS colours, Inter for text and numbers. **One component style everywhere:** a button, field, card or badge looks the same on a public page and on an organizer work screen. The two layers ([Brand layer and motion](#brand-layer-and-motion)) differ only in illustrations, celebration and how much motion plays, never in how a component looks. The two logo arcs (`ActiveCorners`) mark one active thing — the active sidebar item, the active tab, the current step, the current event card — and nothing else: never rows, controls, badges, buttons, hover or empty states. The same arcs inside a brand illustration are drawing, not a marker, and are allowed.

**Tokens live in `apps/frontend/src/styles/global.css`.** That file is the only source of truth for colour, radius and shadows. This file says how to _use_ them.

## Colour

- **Never hardcode a colour.** No `#hex`, no `bg-blue-500`, no `rgb()`. Use the semantic classes only: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-primary`, `bg-secondary`, `border-border`, `bg-destructive`.
- **`primary` is for actions, not decoration.** One primary button per view. Everything else is `outline`, `ghost` or a plain link.
- **`destructive` only for destructive actions and errors.** Never for emphasis.
- **`accent` is a quiet teal tint, not a brand colour.** It marks badges, icon tiles, the active tab and hover surfaces. The brand colour is `primary`; `link` is the teal for text links and accented words.
- Body text is `foreground`; supporting text is `muted-foreground`. There is no third level.
- **Ink edge = you can act on it.** `border-strong` (ink) goes on: buttons (not ghost or link), fields, checkbox, radio and switch, clickable cards and the term label, the selected tab or segment, pagination and the back control; overlays (dialog, sheet, popover and dropdown, toast); and only the top-level content containers on the page canvas (the table card, form panels, the price panel) plus the event page cover photo (all round). The catalog card photo sits flush with the card edge with only an ink bottom divider, so the edges don't double. **No ink edge:** status and feedback — `Badge` and `Alert` (and panels that look like one) keep the tonal surface and ink text without an edge — and static blocks inside a container, which stay the grey hairline (`border-border`, via `nested:`, see [Surfaces](#surfaces)).
- **Status badges are tonal:** the tone's surface and ink text, no edge (only `neutral` and `secondary`, whose `#f5f9fa` equals the surfaces, keep a grey hairline so the pill stays visible) — Confirmed `positive`, Waitlisted `waitlist`, warning `warning`, error `danger`, To evaluate and neutral `neutral`, Cancelled `inactive`. Never `brand-warm`.
- **Orange (`brand-warm`, `brand-warm-subtle`) is a highlight surface, never anything else.** It appears only as a `brand-warm-subtle` panel with an ink edge that highlights a sum (the price / summary panel), as the hover and press surface of the ink-edged secondary controls (outline and secondary buttons, the pagination arrows, the round back control), the highlighter stripe under the key words of a public heading (the heading keeps its own colour), in illustrations and on the sticker surface; content on it is always ink. There is no orange button: every primary button is teal at rest, on hover and pressed. Orange is never text, a link, focus, a badge or a status colour, and never touches primary teal (a white gap or an ink line between them).

## Layout

- **Cards group a section or an item of a list** — an event in a list, "Your account" on a settings page, the sign-in form, a feature on the landing. Card = `bg-card`, ink edge (`border-border-strong`), `rounded-lg`, no shadow, padding 24 (list items 20 top and bottom); its heading is an `h2`. Cards are not a layout tool: no card for a whole page, no card just to add a box.
- **Never nest a card inside a card.** If content needs grouping inside a card, use spacing and a hairline divider (a top border on the row).
- **A page is not a card.** Page content sits on `background` in a column (`max-w-196` = 784 px for forms and settings, full width for overviews, `max-w-200` = 800 px for the application form in `PublicLayout`); the cards sit in that column.
- **Every page keeps the app chrome.** The header is present on every route, including login and sign-up. Pages never render as standalone islands.
- The landing has four parts and the footer: the hero (heading with the highlighted words, one sentence, `lg` primary „Create an event“ and secondary „Find an event“ with the no-account note, the camp illustration), a `muted` band with one wide and three feature cards with brand illustrations, and a closing section repeating the hero entries 1:1. Public pages use the brand illustrations from `assets/illustrations` (logo arcs, fills only); the event catalog, sign-in and sign-up still use the slanted accent band (`BandBackdrop`) until their redesign; event cards in the catalog show the event's photo. Elsewhere, carousels, decorative illustrations or gradients, and any section whose only purpose is to look full are forbidden.
- Signed-in areas: sidebar 240 px (`sidebar` tokens, nav items 44 px without borders; the Figma support link waits until a support channel exists), the account (avatar, name, e-mail; its menu opens upwards) at the bottom of the sidebar, top bar 64 px (role label, language and theme switchers), content padding 32. Below `md` the sidebar moves into a sheet opened from the top bar (56 px: menu, logo, language and theme), the account stays at the bottom of the sheet.

## Brand layer and motion

Two layers ([Figma Komponenty, brand](https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27355-3504)), one component style. The **expressive** layer — brand illustrations, the warm highlight surfaces, the `Sticker`, celebration — belongs only to public pages and milestones (a confirmed place, a payment). Organizer work screens stay **calm**: no illustrations, no sticker, motion only `--duration-fast` / `--duration-base` with `--ease-standard`. Both layers use the same components with the same ink edge, lift and focus; a layer never restyles a component.

- **Lift** (the `lift` utility in `global.css`, Figma specimen `27535:3692`): on hover the element moves `--offset-hard` (3 px) up and left onto `shadow-hard` (a 3 px ink offset shadow, no blur); pressed, it settles back without the shadow. Primary keeps its teal on hover and turns `primary-pressed` when pressed; outline and secondary take `brand-warm-subtle` on hover and press. Only `translate` and `box-shadow` move, `--duration-fast` with `--ease-standard`. With reduced motion there is no translate, the shadow still shows. **Only public pages move** (landing, catalog, event page, application form, sign-in): in the work layer — the organizer and participant area, where `AreaLayout` sets `data-layer="work"` on `<body>` (dialogs opened there included) — `lift` keeps the hard shadow and the surface change but does not translate (`--lift-offset: 0`). Don't re-implement this per screen. It belongs to what you press and that has an ink edge: primary, outline, secondary, destructive and success buttons, clickable cards (also the catalog event card and the selectable term card), the pagination arrows and the round back control. Ghost buttons only take the `secondary` surface on hover. Link buttons, fields, badges, alerts, tabs and table rows never lift; rows of dense organizer tables stay flat (hover is the `muted` surface).
- **Disabled** controls are flat: `disabled` surface, `disabled-foreground` text, the ink edge stays, no lift. A pending button (`aria-busy`) keeps its colours.
- Motion uses the tokens in `global.css` (`--ease-standard`, `--ease-enter`, `--ease-overshoot`, `--ease-effect`, `--duration-fast` 120, `--duration-base` 180, `--duration-slow` 400, `--duration-mark` 650). Opacity and colour never overshoot; only scale, position and rotation may.
- M31 (the logo arcs assemble the illustration) plays once per page load on the landing; M32 (the sticker sticks, then its check draws) once when the result is known. Neither loops.
- Every animation is declared inside `@media (prefers-reduced-motion: no-preference)`; JavaScript that starts motion checks `matchMedia("(prefers-reduced-motion: reduce)")`. With reduced motion the end state shows at once, and text and controls never wait for motion.
- The sticker is decoration (`aria-hidden`), tilted −2° in the app and up to −8° only inside a landing illustration; the state is always in text next to it.

## Spacing

Use the scale only: `1, 2, 3, 4, 5, 6, 8, 10, 12, 16` (Tailwind units — 4px…64px). No arbitrary values like `p-[13px]`. Related things get `gap-2`/`gap-3`; separate blocks get `gap-6`/`gap-8`. `5` (20px) is for compact padding and gaps (list items, cards and gaps at 360 px), `10` (40px) for the gap under a section heading on public pages. Page sections are at most `16` (64px) apart.

## Type

- One `h1` per page. Headings step down without skipping.
- Sizes come from the scale: `text-sm` supporting, `text-base` body, `text-lg`/`text-xl` subheads, `text-2xl`+ page titles. Body does not.
- Use Inter for all interface text, including counts, amounts and IDs. Use `tabular-nums` in Inter where digits must align. Headings use `tracking-tight`.
- Sentence case everywhere. No ALL CAPS except a single small label style (`text-xs uppercase tracking-wider`, e.g. the role in the top bar), used sparingly.

## Surfaces

- **Edges are ink, inner structure is grey — never ink inside ink.** Outer cards and panels on the page canvas: 1 px ink (`border-border-strong`), `rounded-lg` (12), no shadow; so are the controls and overlays listed under [Colour](#colour), at least 3:1 against the canvas in both themes; badges and alerts have none. Inside them everything structural stays `border-border`: dividers (`Separator`), the table header line and row separators, list rows inside a card, and cards nested in a card or a dialog (the shared `Card` turns grey there by itself; a hand-rolled outer container writes `border-border-strong nested:border-border`, the `nested` variant from `global.css`). Controls inside a card keep their ink edge. One edge, not two adjacent ones: a table inside a card has no edge of its own.
- **No soft shadows.** Depth is a hard ink offset shadow without blur: `shadow-hard` (3 px) on a lifted control or clickable card and on dropdowns and popovers, `shadow-sticker` (4 px) on toasts and the `Sticker`, `shadow-dialog` (6 px) on dialogs, set in `DialogContent` — screens don't pass their own shadow. Static cards, fields, badges, alerts and table rows have none.
- Radius comes from the token (DS scale 4 / 6 / 8 / 10 / 12 / 20): `rounded-lg` cards, alerts, toasts and floating menus, `rounded-xl` dialogs, `rounded-control` buttons, fields and section tabs, `rounded-md` small buttons and pagination, `rounded-checkbox` checkboxes, `rounded-sm` menu items, `rounded-full` badges, view segments (`ViewToggleGroup` and the default `Tabs` variant) and avatars. Never mix radii in one component.

## Forms

- Heights come from the kit: `Button` default 40, `lg` 44; `Input` and `Select` 44. Page and form actions are `lg` (44), so they line up with inputs; `xl` is not used. Row actions in dense tables and row lists (applications, payments, substitutes, change requests, rooms) are `sm` (32), icon actions `icon-sm`. Don't override heights per screen. (Figma draws controls at 48; the code keeps the compact heights until density is unified as a separate design step.)
- Every input has a visible `<label>`. Placeholders are examples, never labels.
- Validation runs client-side _and_ server-side. The client message appears under the field.
- The submit button shows a pending state and is disabled while submitting.
- Never disable a submit button just because the form is untouched — let the user try and show them what's wrong.

## Toasts and alerts

All toasts go through `notify` (`@/lib/notify`) — never `toast` from `sonner` directly (ESLint enforces it). Tones Success, Info, Warning, Error; bottom right (24 px inset on desktop; full width at the bottom with a 16 px inset on mobile); Success and Info disappear after 4 s, Warning and Error after 8 s. Component: DS / Toast in Figma.

- **Toast**: confirmation of a finished action after which the dialog closes or the page changes (create, save, add, delete, copy link); an error of an action that has no form of its own (delete from a row menu, copy to clipboard failed). Short: the title is the result of the action, a description only when it adds information. No buttons or links. Never carries information the user needs for the next step.
- **Alert in the page**: a form submission error (validation, server error) — it stays above the submit button until fixed; the state of the whole page (link sent, invalid link, what is missing to publish). A form that stays open shows its error with an Alert, not a toast.
- Server errors are always shown as a translated message by error code (`errors.json`), never the raw message.

## Copy

Copy exists only so the user makes the right decision or knows the next step; everything else is noise. These rules come from the PM's business review (#495, #546, #550, #578) and apply to every new or changed text in the UI — dialogs above all. Where a Figma frame's copy breaks them, follow the rules and report it in the PR. Wording and terms: [`docs/SLOVNIK.md`](docs/SLOVNIK.md); Czech always uses vykání.

1. **Don't repeat what is on screen.** No sentence restating a value shown in the line above or elsewhere in the view. ✗ „Dámská kapacita klesne ze 2 na 0 míst“ followed by „Provizorní F má 2 místa.“ — keep the first line only.
2. **Only what changes the decision.** For each sentence ask: does the user decide differently or have to do something because of it? If not, delete it. This especially covers what the system does on its own in the background — e-mails to other people, history entries, recalculations. ✗ „Náhradník dostane e-mail o změně přihlášky s platebními údaji.“, „Změna zůstane v historii a přihlašovatel dostane e-mail.“, „Smazání přepočítá kapacitu pouze tohoto termínu.“ ✓ „Lůžko automaticky zaplní náhradník.“ (the organizer must know before confirming).
3. **Don't reassure about what doesn't happen.** No sentence saying something stays unchanged when nobody would expect it to change. ✗ „Program zdrojového termínu zůstane stejný. Kopii můžete dále upravovat samostatně.“, „Existující potvrzení účastníků se nezmění.“ Warn only about the unexpected or irreversible: ✓ „Stávající program se smaže. Nelze vzít zpět.“
4. **The heading carries the point; a description only when it says what to do.** ✓ **Platba se automaticky nevrací.** Vratku zapište ručně.
5. **Warnings for one action go in one block.** Several warnings are not separate sentences scattered over a dialog but one Alert with one short line each. ✗ „Platba se mezi termíny nepřevádí.“ … „Peníze se nevracejí automaticky.“ … „Po potvrzení se původní lůžko ihned uvolní.“ in three places.
6. **No add-ons after a dot in headings.** A subheading is a name, not a list of contents. ✗ „Původní termín · vratka“, „Nový termín · nová částka k úhradě“ ✓ „Původní termín“, „Nový termín“.
7. **The user's language, not accounting or system terms.** ✗ „Zaplaceno 0 Kč · dluh po odhlášení 0 Kč“ ✓ „Zatím jste nic neplatili, nemusíte nic řešit.“
8. **An action result doesn't linger.** It is a toast (see above), or it disappears with the next action. ✗ „Zkopírovány 2 bloky · 2 bloky přeskočeny“ still shown after the next edit.

Before handing over: every sentence in a dialog maps to a decision or step of the user; nothing on the screen is said twice; warnings sit in one block with a heading; counts and prepositions are declined correctly („1 lůžko“, „ze 2“).

## Every list has three states

Loading, empty, and error — all three, always. An empty list renders an empty state with one sentence saying what would appear here, not a blank area. An error renders the message and a way to retry.

Data refreshes itself: refetch when the tab regains focus, and invalidate the query after a mutation. A manual "reload" button in normal UI means one of those is missing — retry belongs in the error state only.

## Accessibility (the floor, not the ceiling)

- Buttons are `<button>`, links are `<a>`/`<Link>`. Never a `div` with `onClick`.
- Every icon-only control has an `aria-label`.
- Focus rings are never removed. Focus is a 2 px teal outline 2 px off the element (`outline-ring`), the same on every control in both layers; orange never marks focus. If you restyle focus, it must stay clearly visible.
- Control boundaries (the ink edge) keep at least 3:1 against what is around them; selection and state are never carried by colour alone (a check, an edge or text goes with it).
- Text contrast at least 4.5:1 — the tokens are chosen to satisfy this; hardcoded colours are how you break it.

## When you are unsure

Prefer less: fewer borders, fewer boxes, fewer font sizes, more whitespace. If a screen feels plain, the fix is usually better spacing and clearer hierarchy, not another container.

## Extending this file

When a code review keeps repeating the same UI feedback, add it here as a rule. That is the point of the file: expectations live in the repo, not in someone's head.
