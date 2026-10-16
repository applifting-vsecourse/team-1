# Togena — frontend

React + Vite, TanStack Router (file-based routy) a TanStack Query, Tailwind + shadcn/ui, `ky` + `zod` na hranici s API. Vzory vycházejí z [Applifting Frontend Playbooku](https://applifting.github.io/frontend-playbook/).

Před prací na UI si přečti [DESIGN.md](../../DESIGN.md).

## Struktura

```
src/
  app/                router, providers, ROUTES (všechny URL na jednom místě)
  routes/             stránky (TanStack file-based) — tenké: načtou data, složí stránku
    index.tsx                     /                    landing
    apply/                        /apply/*             veřejná přihláška
    organizer/login.tsx           /organizer/login
    organizer/_app.tsx            layout + guard pro /organizer/*
    participant/…                 totéž pro účastníka
  i18n/               i18next: init, typy klíčů, locales/{en,cs}/<namespace>.json
  components/         sdílené komponenty podle atomic designu — viz src/components/README.md
  features/<feature>/ doménová logika jedné oblasti
    api/              zod schémata, queryOptions, query keys, mutace
    hooks/            React hooky nad api/
    components/       doménové bloky složené z components/**
    lib/              pomocné funkce feature
  config/ hooks/ lib/ styles/
```

- Importy přes alias `@/` (= `src/`). Relativně jen sourozenec ve stejné složce.
- Feature neimportuje z jiné feature. Co potřebují dvě features, patří do `components/` nebo `lib/`.
- `routeTree.gen.ts` je generovaný (dev server / build) a commituje se. Při konfliktu ho nespojuj ručně — vezmi kteroukoliv verzi a pusť `pnpm frontend build`.

## Lokalizace

Výchozí jazyk je angličtina, při první návštěvě rozhoduje prohlížeč, přepínač je v hlavičce. Texty nikdy nepiš napevno:

```tsx
const { t } = useTranslation("events") // namespace = tvoje feature
<PageHeader title={t("list.title")} />
```

Nový text přidej do `src/i18n/locales/en/events.json` i `cs/events.json`. Klíče jsou typově kontrolované a test `i18n/locales.test.ts` spadne, když se jazykové verze liší. Peníze a data formátuj přes `formatCzk` / `formatDate` z `@/lib`.

## Data z API (vzor)

```ts
// features/events/api/eventSchemas.ts — každá odpověď serveru projde zod schématem
export const eventSchema = z.object({ id: z.string(), name: z.string() })
export type Event = z.infer<typeof eventSchema>

// features/events/api/eventsQueryOptions.ts
export const eventsQueryOptions = () =>
  queryOptions({
    queryKey: eventKeys.lists(),
    queryFn: async () => z.array(eventSchema).parse(await api.get("organizer/events").json()),
  })
```

Po mutaci invaliduj dotčené query (`queryClient.invalidateQueries`). Ruční tlačítko „Obnovit“ patří jen do chybového stavu.

## Příkazy

Z kořene repozitáře:

```bash
pnpm frontend dev          # http://localhost:3050
pnpm frontend test         # Vitest ve watch módu
pnpm frontend test:ci
pnpm frontend lint:check
pnpm frontend type-check
pnpm frontend build
```

## Env

`.env` vznikne z [`.env.example`](.env.example) při `pnpm dev`. Proměnné pro frontend musí mít prefix `VITE_` a zapékají se do bundlu při buildu.
