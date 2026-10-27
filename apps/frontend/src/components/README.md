# Komponenty

Sdílené komponenty bez byznys logiky, podle atomic designu. Nevědí nic o akcích, přihláškách ani o API — data a callbacky dostávají přes props. Doménové bloky (formulář akce, tabulka přihlášek) patří do `src/features/<feature>/components/`.

| Vrstva       | Co tam patří                                         | Příklady                                                        |
| ------------ | ---------------------------------------------------- | --------------------------------------------------------------- |
| `ui/`        | vendored shadcn — **neupravovat**, přidávat přes CLI | Button, Input, Dialog, Form                                     |
| `atoms/`     | nejmenší vlastní prvky                               | Logo, NavLink, MoneyAmount, Seo                                 |
| `molecules/` | složení několika atomů / ui prvků s jedním účelem    | PageHeader, EmptyState, ErrorState, LoadingState, ThemeSwitcher |
| `organisms/` | samostatné části stránky                             | Header                                                          |
| `templates/` | kostra stránky se sloty                              | PublicLayout, AuthLayout, AreaLayout                          |
| `pages/`     | systémové stránky bez vlastní routy                  | NotFoundPage, ForbiddenPage, ErrorPage, LoadingPage             |

Stránky aplikace jsou routy v `src/routes/` — skládají template, organismy a feature komponenty.

## Pravidla

- **Vrstva importuje jen z nižších vrstev** (`ui` < `atoms` < `molecules` < `organisms` < `templates` < `pages`). Hlídá to ESLint.
- **`components/` neimportuje z `features/`.** Když komponenta potřebuje něco z feature (např. uživatelské menu), dostane to jako slot (`ReactNode` prop) — viz `Header` a `userMenu`.
- Chybí ovládací prvek? `pnpm dlx shadcn@latest add <name>` (z `apps/frontend`) a odstranit `shadow-xs` / `shadow-sm` z polí a ovládacích prvků (stín patří jen kartám a plovoucím prvkům), viz [DESIGN.md](../../../../DESIGN.md).
- Nová komponenta jde do nejnižší vrstvy, kam dává smysl. Když ji použije jen jedna feature, zůstává ve feature.
- Každý seznam má tři stavy: `LoadingState`, `EmptyState`, `ErrorState`.
- Žádné texty napevno: každý text jde přes `useTranslation()` a klíče v `src/i18n/locales/{en,cs}`. Sdílené komponenty používají namespace `common`.
