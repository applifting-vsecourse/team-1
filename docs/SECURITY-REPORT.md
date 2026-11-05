# Security report

Stav k 5. 11. 2026. První verze reportu je z 31. 10. 2026 ([US-126](https://github.com/applifting-vsecourse/team-1/issues/219)). Report popisuje stav a nic neopravuje, opravy vznikají jako samostatné issues.

## Shrnutí

- **Závislosti:** `pnpm audit` hlásí 74 nálezů místo 129 (6 kritických, 31 vysokých). V produkčním stromu je jich 51 místo 114. Kód, který aplikace spouští, už žádný nález nemá. Zbylé nálezy jsou v balíčcích, které se nespouštějí, nebo jen ve vývojových nástrojích.
- **Žádný kritický nález není u nás podle ověřených podmínek zneužitelný.** `better-auth` je na 1.7.15, kritická chyba GHSA-965c-763c-88jm je opravená.
- **Nastavení:** staging i API posílají bezpečnostní hlavičky, nginx neprozrazuje verzi. Zbývá vlastní omezení počtu požadavků ([#294](https://github.com/applifting-vsecourse/team-1/issues/294)) a rozhodnutí o Swaggeru v produkci ([#295](https://github.com/applifting-vsecourse/team-1/issues/295)).
- **Sledování:** Dependabot security i version updates, dependency review v PR, denní audit, CodeQL a secret scanning s push protection jsou zapnuté. Akce v GitHub Actions jsou připnuté na SHA commitu.

## Co se od 31. 10. změnilo

| Oblast                           | 31. 10.                                        | 5. 11.                                                                                             | Kde                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm audit`                     | 129 (9 kritických, 52 vysokých)                | 74 (6 kritických, 31 vysokých)                                                                     | aktualizace závislostí, [#327](https://github.com/applifting-vsecourse/team-1/pull/327), [#329](https://github.com/applifting-vsecourse/team-1/pull/329) |
| `pnpm audit --prod`              | 114 (6 kritických, 46 vysokých)                | 51 (5 kritických, 19 vysokých)                                                                     | dtto                                                                                                                                                     |
| `better-auth`                    | 1.7.1, kritická chyba                          | 1.7.15                                                                                             | [#327](https://github.com/applifting-vsecourse/team-1/pull/327)                                                                                          |
| `multer`, `qs`, `zod`, `seroval` | pod opravenou verzí                            | 2.5.0, 6.17.1, 4.6.7, 1.7.7                                                                        | [#327](https://github.com/applifting-vsecourse/team-1/pull/327), `multer` přes `pnpm.overrides`                                                          |
| Bezpečnostní hlavičky            | žádné                                          | CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; backend `helmet` | [#326](https://github.com/applifting-vsecourse/team-1/pull/326)                                                                                          |
| Nginx                            | `nginx:1.27-alpine`, verze v hlavičce `Server` | `nginx:1.31-alpine`, `server_tokens off`                                                           | [#326](https://github.com/applifting-vsecourse/team-1/pull/326)                                                                                          |
| Dependabot                       | jen bezpečnostní PR, security updates vypnuté  | security updates zapnuté, týdenní seskupené version updates                                        | [#284](https://github.com/applifting-vsecourse/team-1/pull/284)                                                                                          |
| Secret scanning                  | vypnutý                                        | zapnutý včetně push protection                                                                     | nastavení repa                                                                                                                                           |
| CodeQL                           | nebylo                                         | default setup, 4 nálezy opravené, 0 otevřených                                                     | nastavení repa                                                                                                                                           |
| GitHub Actions                   | připnuté na tag, token s výchozími právy       | připnuté na SHA, `permissions: contents: read`                                                     | [#284](https://github.com/applifting-vsecourse/team-1/pull/284), [#333](https://github.com/applifting-vsecourse/team-1/pull/333)                         |

## Závislosti

Zdroj: `pnpm audit` a `pnpm audit --prod` na `main` k 5. 11., 1 474 závislostí.

| Závažnost  | Celkem 31. 10. | Celkem 5. 11. | `--prod` 31. 10. | `--prod` 5. 11. |
| ---------- | -------------- | ------------- | ---------------- | --------------- |
| Kritická   | 9              | 6             | 6                | 5               |
| Vysoká     | 52             | 31            | 46               | 19              |
| Střední    | 54             | 30            | 48               | 23              |
| Nízká      | 14             | 7             | 14               | 4               |
| **Celkem** | **129**        | **74**        | **114**          | **51**          |

Dependabot alerts teď v repu fungují a hlásí 70 otevřených upozornění (6 kritických, 29 vysokých), tedy zhruba totéž co `pnpm audit`.

### Kód, který běží

Bez nálezu. `better-auth`, `multer`, `qs`, `zod` a `seroval` z první verze reportu jsou na opravených verzích a audit je nehlásí.

### Nainstalované, ale nespouštěné

- `next` (5 kritických, 12 vysokých), `sharp`, `postcss`: přicházejí přes `better-auth`. Kód je v `node_modules`, ale neimportujeme ho, Next nemáme. `better-auth` 1.7.15 `next` pořád táhne. `mysql2` je ve stromu dál, ale na verzi bez nálezu.
- `js-yaml`: přes `@nestjs/swagger`, týká se jen Swaggeru na `/api/docs` (viz [#295](https://github.com/applifting-vsecourse/team-1/issues/295)).

### Jen ve vývojových nástrojích

- `fast-uri`, `brace-expansion`, `glob`, `minimatch`, `deepmerge`: přes `@nestjs/cli`. Opravu přinese až NestJS 12, major verze se aktualizují zvlášť.
- `shell-quote` (kritická): přes `npm-run-all`.
- `source-map-js`: přes `@tailwindcss/vite`, jen při buildu frontendu.

### `brotli`

V `pnpm-lock.yaml` žádný balíček `brotli` není a `pnpm audit` ho nehlásí. Komprese Brotli je součástí Node, takže ji řeší aktualizace Node, ne závislost.

## Prostředí

| Část      | Stav                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Node      | Vyžadujeme `>=24`, `.nvmrc` je `24`, Docker `node:24-alpine`, takže build vezme aktuální 24.x. Verzi na stagingu jsme neověřili. |
| Nginx     | `nginx:1.31-alpine`. Staging posílá hlavičku `Server: nginx` bez verze.                                                          |
| Postgres  | `postgres:17-alpine` v `docker-compose.yml`. Staging spravuje kurz.                                                              |
| Kontejner | Backend běží pod uživatelem `node`, ne pod rootem.                                                                               |

## Přehled podle OWASP Top 10 (2021)

| Kategorie                 | Stav        | Co jsme našli                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 Řízení přístupu       | Neúplné     | Pravidla `@Auth` a `OrganizationAccessService` existují. Kontrola endpointů jednoho po druhém je [#331](https://github.com/applifting-vsecourse/team-1/issues/331).                                                                                                                                                            |
| A02 Kryptografie          | Bez nálezu  | Hesla a session řeší BetterAuth. Staging běží na HTTPS a posílá HSTS.                                                                                                                                                                                                                                                          |
| A03 Injection             | Bez nálezu  | Ve zdrojích aplikace jen parametrizovaný `$queryRaw`, `$executeRawUnsafe` je jen v seedu a testech. Žádný `dangerouslySetInnerHTML`. CSP zakazuje inline skripty. Validaci všech vstupů jsme neprocházeli.                                                                                                                     |
| A04 Nezabezpečený návrh   | Riziko      | Veřejná přihláška nemá vlastní omezení počtu požadavků ([#294](https://github.com/applifting-vsecourse/team-1/issues/294), čeká na PO). Souvisí s [US-74](https://github.com/applifting-vsecourse/team-1/issues/74).                                                                                                           |
| A05 Chybná konfigurace    | Částečně    | Frontend i API posílají bezpečnostní hlavičky, backend má `helmet`, nginx skrývá verzi. Swagger na `/api/docs` je v produkci dál veřejný ([#295](https://github.com/applifting-vsecourse/team-1/issues/295), čeká na PO). Klíč k Resend je v Docker image ([#296](https://github.com/applifting-vsecourse/team-1/issues/296)). |
| A06 Zranitelné komponenty | Částečně    | Spouštěný kód bez nálezu, zbývá `next` přes `better-auth` a vývojové nástroje. Viz [Závislosti](#závislosti).                                                                                                                                                                                                                  |
| A07 Autentizace           | Částečně    | Registrace je vypnutá, session platí 7 dní bez návštěvy. Na přihlášení platí jen výchozí limit BetterAuth ([#294](https://github.com/applifting-vsecourse/team-1/issues/294)).                                                                                                                                                 |
| A08 Integrita softwaru    | Bez nálezu  | CI instaluje s `--frozen-lockfile`, GitHub Actions jsou připnuté na SHA commitu, dependency review blokuje PR s novou vysokou nebo kritickou zranitelností.                                                                                                                                                                    |
| A09 Logování a monitoring | Mimo rozsah | Řeší [US-75](https://github.com/applifting-vsecourse/team-1/issues/75).                                                                                                                                                                                                                                                        |
| A10 SSRF                  | Neověřeno   | Cílenou kontrolu jsme nedělali, je součástí [#331](https://github.com/applifting-vsecourse/team-1/issues/331).                                                                                                                                                                                                                 |

## Sledování zranitelností

Popsané v [`SECURITY.md`](../SECURITY.md). Ve zkratce:

- Dependabot security updates otevírají PR s opravou hned po zveřejnění chyby, version updates každé pondělí seskupeně.
- Workflow [`dependency-review.yml`](../.github/workflows/dependency-review.yml) zablokuje PR, který přidá závislost s vysokou nebo kritickou chybou.
- Workflow [`security-audit.yml`](../.github/workflows/security-audit.yml) denně spustí `pnpm audit` a selže při kritickém nálezu v produkčních závislostech.
- CodeQL kontroluje každý PR, secret scanning s push protection zablokuje push s tajným klíčem.

## Navržené opravy

| #   | Oprava                                                                                   | Stav                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Aktualizovat `better-auth` na ≥ 1.7.7 a zjistit, jestli lze odstranit `next` a `mysql2`. | Částečně: `better-auth` 1.7.15, `next` ve stromu zůstává.                                                                                  |
| 2   | Bezpečnostní hlavičky v nginx, `helmet` v backendu, skrýt verzi nginx.                   | Hotovo ([#326](https://github.com/applifting-vsecourse/team-1/pull/326)).                                                                  |
| 3   | Omezit počet požadavků na veřejné přihlášce a nastavit limity přihlašování.              | Otevřené ([#294](https://github.com/applifting-vsecourse/team-1/issues/294), čeká na PO).                                                  |
| 4   | Vypnout Swagger v produkci, nebo ho záměrně nechat veřejný.                              | Otevřené ([#295](https://github.com/applifting-vsecourse/team-1/issues/295), čeká na PO).                                                  |
| 5   | Povýšit nginx na podporovanou větev, aktualizovat `multer`, `qs`, `zod` a `seroval`.     | Hotovo ([#326](https://github.com/applifting-vsecourse/team-1/pull/326), [#327](https://github.com/applifting-vsecourse/team-1/pull/327)). |
| 6   | Zapnout Dependabot security updates a secret scanning.                                   | Hotovo ([#284](https://github.com/applifting-vsecourse/team-1/pull/284) a nastavení repa).                                                 |
| 7   | Projít endpointy jeden po druhém podle A01 a A10.                                        | Otevřené ([#331](https://github.com/applifting-vsecourse/team-1/issues/331)).                                                              |
| 8   | Připnout GitHub Actions na SHA commitu.                                                  | Hotovo ([#333](https://github.com/applifting-vsecourse/team-1/pull/333)).                                                                  |
| 9   | Dostat klíč k Resend z Docker image do proměnných prostředí.                             | Otevřené ([#296](https://github.com/applifting-vsecourse/team-1/issues/296), čeká na přístup do Coolify).                                  |

## Jak report zopakovat

```shell
pnpm audit
pnpm audit --prod
curl -sI https://team-1.vsepractical.applifting.dev
curl -sI https://team-1.vsepractical.applifting.dev/api/me
```
