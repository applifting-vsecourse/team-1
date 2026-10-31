# Security report

Stav k 31. 10. 2026 ([US-126](https://github.com/applifting-vsecourse/team-1/issues/219)). Report popisuje stav a nic neopravuje, opravy vzniknou jako samostatné issues.

## Shrnutí

- **Závislosti:** `pnpm audit` hlásí 129 nálezů (9 kritických, 52 vysokých). Z nich 114 je v produkčním stromu, ale většina jsou balíčky, které aplikace nikdy nespustí.
- **Žádný kritický nález není u nás podle ověřených podmínek zneužitelný.** Kritická chyba `better-auth` vyžaduje OAuth přihlášení, které nemáme. Začala by platit, kdybychom ho zapnuli.
- **Největší slabina je v nastavení:** aplikace neposílá bezpečnostní hlavičky a veřejná API nemají vlastní omezení počtu požadavků.
- **Prostředí:** staging běží na `nginx/1.27.5` z větve 1.27, kterou máme napevno. Node v Dockeru se bere jako `node:24-alpine`, přesnou verzi na stagingu jsme neověřili.

## Závislosti

Zdroj: `pnpm audit` a `pnpm audit --prod` ve větvi z `main`, 1 451 závislostí.

| Závažnost | Celkem | Z toho `--prod` |
| --------- | ------ | --------------- |
| Kritická  | 9      | 6               |
| Vysoká    | 52     | 46              |
| Střední   | 54     | 48              |
| Nízká     | 14     | 14              |

`--prod` zahrnuje i to, co přinesla závislost `better-auth` (například `next`, `vitest`), a tady se proto nálezy dělí podle toho, jestli kód opravdu běží.

### Kód, který běží

| Balíček       | Verze  | Oprava   | Dopad u nás                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `better-auth` | 1.7.1  | ≥ 1.7.7  | [GHSA-965c-763c-88jm](https://github.com/advisories/GHSA-965c-763c-88jm) (kritická): útočník by se přihlásil za jiného uživatele. Podmínkou je Magic Link spolu se social nebo Generic OAuth. Magic Link používáme, OAuth ne, takže dnes zneužitelné není. [GHSA-r4xp-prcw-77qf](https://github.com/advisories/GHSA-r4xp-prcw-77qf) se týká pluginu OAuth Proxy, ten nepoužíváme. Aktuální verze je 1.7.14. |
| `multer`      | 2.2.0  | ≥ 2.5.0  | Vysoká, DoS při nahrávání souborů. Přichází přes `@nestjs/platform-express`. V kódu není žádný `FileInterceptor`, takže žádný endpoint nahrávání nepřijímá.                                                                                                                                                                                                                                                 |
| `qs`          | 6.15.3 | ≥ 6.16.1 | Střední, DoS. Přichází přes Express. Dosažitelnost jsme neověřili.                                                                                                                                                                                                                                                                                                                                          |
| `zod`         | 4.4.3  | ≥ 4.6.6  | Vysoká, paměť při validaci velkých kolekcí. Parsuje odpovědi serveru ve frontendu. Backend ho nepoužívá.                                                                                                                                                                                                                                                                                                    |
| `seroval`     | 1.6.2  | ≥ 1.6.11 | Vysoká. Přichází přes TanStack Router. Dosažitelnost v našem klientském bundlu jsme neověřili.                                                                                                                                                                                                                                                                                                              |

### Nainstalované, ale nespouštěné

- `next` (5 kritických, 12 vysokých), `sharp`, `postcss`, `mysql2`, `vitest`, `vite`, `undici`: přicházejí přes `better-auth`. Kód je v `node_modules`, ale neimportujeme ho, nemáme Next ani MySQL. Správně je sem `better-auth` vůbec netahat, pokud to jeho nová verze dovolí.
- `engine.io`, `glob`, `minimatch`, `brace-expansion`: přes `react-email`. Patří k náhledovému serveru a CLI. Použití za běhu jsme neověřili.
- `deepmerge-ts`, `fast-uri`: přes `prisma` a vývojové nástroje.
- `handlebars`, `shell-quote` (kritické): jen ve vývojových nástrojích (`ts-jest`, `npm-run-all`), mimo `--prod`.

### `brotli`

V `pnpm-lock.yaml` žádný balíček `brotli` není a `pnpm audit` ho nehlásí. Komprese Brotli je součástí Node, takže ji řeší aktualizace Node, ne závislost.

## Prostředí

| Část      | Stav                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node      | Vyžadujeme `>=24`, `.nvmrc` je `24`, Docker `node:24-alpine`, takže build vezme aktuální 24.x. Nejnovější je 24.22.2, poslední bezpečnostní 24.22.1 (20. 10. 2026). Verzi na stagingu jsme neověřili. |
| Nginx     | `nginx:1.27-alpine` je daný napevno, staging hlásí `nginx/1.27.5` a verzi posílá v hlavičce `Server`. Zranitelnosti této verze jsme neověřovali.                                                      |
| Postgres  | `postgres:17-alpine` v `docker-compose.yml`. Staging spravuje kurz.                                                                                                                                   |
| Kontejner | Backend běží pod uživatelem `node`, ne pod rootem.                                                                                                                                                    |

## Přehled podle OWASP Top 10 (2021)

| Kategorie                 | Stav        | Co jsme našli                                                                                                                                                                  |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 Řízení přístupu       | Neúplné     | Pravidla `@Auth` a `OrganizationAccessService` existují. Endpointy jsme neprocházeli jeden po druhém.                                                                          |
| A02 Kryptografie          | Částečně    | Hesla a session řeší BetterAuth. Staging běží na HTTPS, ale neposílá HSTS.                                                                                                     |
| A03 Injection             | Bez nálezu  | Ve zdrojích aplikace jen parametrizovaný `$queryRaw`, `$executeRawUnsafe` je jen v seedu a testech. Žádný `dangerouslySetInnerHTML`. Validaci všech vstupů jsme neprocházeli.  |
| A04 Nezabezpečený návrh   | Riziko      | Veřejná přihláška nemá vlastní omezení počtu požadavků. Souvisí s [US-74](https://github.com/applifting-vsecourse/team-1/issues/74).                                           |
| A05 Chybná konfigurace    | Riziko      | Staging neposílá CSP, HSTS, `X-Frame-Options` ani `X-Content-Type-Options`. Backend nemá `helmet`. Swagger na `/api/docs` se zapíná i v produkci. CORS je omezený na naše URL. |
| A06 Zranitelné komponenty | Riziko      | Viz [Závislosti](#závislosti).                                                                                                                                                 |
| A07 Autentizace           | Částečně    | Registrace je vypnutá, session platí 7 dní bez návštěvy. Na přihlášení platí jen výchozí limit BetterAuth, vlastní jsme nenastavili.                                           |
| A08 Integrita softwaru    | Částečně    | CI instaluje s `--frozen-lockfile`. GitHub Actions jsou připnuté na tag, ne na commit.                                                                                         |
| A09 Logování a monitoring | Mimo rozsah | Řeší [US-75](https://github.com/applifting-vsecourse/team-1/issues/75).                                                                                                        |
| A10 SSRF                  | Neověřeno   | Cílenou kontrolu jsme nedělali.                                                                                                                                                |

## Sledování zranitelností

- Workflow [`security-audit.yml`](../.github/workflows/security-audit.yml) jednou týdně a na vyžádání spustí `pnpm audit --prod`. Běh selže při kritickém nálezu.
- [`dependabot.yml`](../.github/dependabot.yml) hlídá npm, Docker a GitHub Actions a otevírá jen bezpečnostní PR. V nastavení repa musí být zapnuté „Dependabot security updates“, teď jsou vypnuté.
- Dependabot alerts jsou v repu zapnuté, API ale vrací 0 upozornění, zatímco `pnpm audit` jich hlásí 129. Proč, jsme nezjistili, proto se sledování neopírá jen o ně.
- Secret scanning je vypnutý, repo je přitom veřejné.

## Navržené opravy

Podle priority, každá jako samostatné issue:

1. Aktualizovat `better-auth` na ≥ 1.7.7 ještě před zapnutím jakéhokoli OAuth přihlášení a zjistit, jestli lze odstranit `next` a `mysql2` ze stromu závislostí.
2. Přidat bezpečnostní hlavičky do `apps/frontend/nginx.conf` a `helmet` do backendu, skrýt verzi nginx.
3. Omezit počet požadavků na veřejné přihlášce a nastavit limity přihlašování.
4. Vypnout Swagger v produkci, nebo ho záměrně nechat veřejný.
5. Povýšit `nginx:1.27-alpine` na podporovanou větev, aktualizovat `multer`, `qs`, `zod` a `seroval`.
6. Zapnout Dependabot security updates a secret scanning.
7. Projít endpointy jeden po druhém podle A01 a A10.

## Jak report zopakovat

```shell
pnpm audit
pnpm audit --prod
curl -sI https://team-1.vsepractical.applifting.dev
```
