# Togena — frontend

React + Vite, TanStack Router (file-based routy) a TanStack Query, Tailwind + shadcn/ui, `ky` + `zod` na hranici s API. Vzory vycházejí z [Applifting Frontend Playbooku](https://applifting.github.io/frontend-playbook/).

Před prací na UI si přečti [DESIGN.md](../../DESIGN.md).

## Struktura

```
src/
  app/                router, providers, ROUTES (všechny URL na jednom místě)
  routes/             stránky (TanStack file-based) — tenké: načtou data, složí stránku
    index.tsx                     /                    landing
    prihlaska/                    /prihlaska/*         veřejná přihláška
    organizator/prihlaseni.tsx    /organizator/prihlaseni
    organizator/_app.tsx          layout + guard pro /organizator/*
    ucastnik/…                    totéž pro účastníka
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
