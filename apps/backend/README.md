# kemp.io — backend

NestJS + Prisma + PostgreSQL + BetterAuth. REST API pod `/api`, Swagger na http://localhost:4050/api/docs.

## Struktura

```
src/
  main.ts             start aplikace, CORS, BetterAuth na /api/auth/*, Swagger
  app.module.ts       registrace modulů
  core/               infrastruktura bez znalosti domény (prisma, email)
  shared/             průřezové věci této aplikace (auth, config, guardy)
  modules/            doménové moduly — viz src/modules/README.md
  scripts/seed/       ukázková data
  generated/prisma/   vygenerovaný Prisma klient (negitovaný)
prisma/
  schema.prisma       datový model
  migrations/         SQL migrace (gitované)
```

Vzor modulu a pravidla vrstev: [src/modules/README.md](src/modules/README.md).

## Příkazy

Spouštěj z kořene repozitáře s prefixem `pnpm backend`:

```bash
pnpm backend start:dev                 # dev server s watch
pnpm backend test                      # unit testy (Jest, bez DB)
pnpm backend test:int                  # integrační testy proti sestavenému serveru a DB kemp_test
pnpm backend test:cov                  # pokrytí → coverage/
pnpm backend lint:check
pnpm backend docker:up:wait            # jen databáze (Postgres na 5433)
pnpm backend seed                      # ukázková data (přeskočí se, když v DB jsou uživatelé)
pnpm backend db:reset                  # smaže DB, aplikuje migrace a znovu seedne
pnpm backend prisma:studio             # prohlížeč dat na http://localhost:5555
```

## Změna datového modelu

1. Uprav `prisma/schema.prisma`.
2. `pnpm backend prisma:migrations:run` — vytvoří a aplikuje migraci.
3. Uprav seed, pokud nová data potřebuje.

Pravidlo týmu: **jedna migrace na PR**. Než PR mergneš, rebasni na `main`; pokud mezitím přibyla jiná migrace, smaž svoji a vygeneruj ji znovu.

## BetterAuth

Autentizace je černá skříňka na `/api/auth/*` (dokumentace na `/api/auth/reference`). Konfigurace je na dvou místech:

- `src/shared/auth/config/better-auth.config.ts` — část, která mění DB schéma (používá ji i CLI `pnpm backend auth:generate`),
- `src/shared/auth/providers/better-auth.provider.ts` — kompletní konfigurace aplikace (e-maily, URL…), rozšiřuje tu první.

Chráněný endpoint: `@UseGuards(AuthenticatedUserGuard)` a přihlášený uživatel přes `@User() user: Identity`.

## E-maily

Šablony jsou React komponenty ([react-email](https://react.email)) v `src/core/email/templates/`. Náhled: `pnpm backend email:dev`.

Odesílání vybírá adaptér podle env (první shoda vyhrává):

1. `RESEND_API_KEY` → Resend,
2. `SMTP_HOST` + `SMTP_USERNAME` + `SMTP_PASSWORD` → SMTP (na stagingu Brevo),
3. jinak se e-mail vypíše do konzole backendu.

```ts
const html = await renderEmail(VerifyEmail, { url });
await emailProvider.sendEmail(user.email, 'Ověření e-mailové adresy', html);
```

## Testy

- **Unit** (`*.spec.ts`) — bez databáze; doménové funkce a services s mockovaným repository. Vzor: `modules/account/services/account.service.spec.ts`.
- **Integrační** (`*.int-spec.ts`) — `pnpm backend test:int` vytvoří DB `kemp_test` (vedle vývojové `kemp`), aplikuje migrace, sestaví backend, spustí ho a testy na něj volají přes HTTP. Každý soubor si data připraví přes `resetAndSeed()`. Vzor: `modules/account/account.int-spec.ts`; helpery v `src/test/integration/test-api.ts` (`api()`, `signIn()`, `connectTestPrisma()`).

Integrační testy jdou proti sestavenému serveru, ne proti Nest aplikaci v Jestu: `better-auth` je čistě ESM a Jest běží v CommonJS.
