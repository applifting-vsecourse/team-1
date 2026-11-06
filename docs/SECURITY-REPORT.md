# Security report

Stav k 6. 11. 2026. První verze reportu je z 31. 10. 2026 ([US-126](https://github.com/applifting-vsecourse/team-1/issues/219)). Report popisuje stav a nic neopravuje, opravy vznikají jako samostatné issues a PR.

Mezi 5. a 6. 11. sloučené [#353](https://github.com/applifting-vsecourse/team-1/pull/353) odstranilo zbylé kritické a vysoké zranitelnosti v závislostech. Sloupec „5. 11.“ je stav před ním.

## Shrnutí

- **Závislosti:** ze 129 nálezů `pnpm audit` k 31. 10. (9 kritických, 52 vysokých) jich 5. 11. zbývalo 74 a dnes **5: žádný kritický ani vysoký**. Zbylé 4 střední a 1 nízký jsou v nástroji pro build backendu (`@nestjs/cli`).
- **Kritické zranitelnosti:** všech 9 je opravených, posledních 6 odstranilo [#353](https://github.com/applifting-vsecourse/team-1/pull/353). Jediná kritická v kódu, který aplikace spouští (`better-auth`, přihlášení za jiného uživatele), byla opravená jako první. Viz [Kritické zranitelnosti](#kritické-zranitelnosti).
- **Nastavení:** staging i API posílají bezpečnostní hlavičky, nginx neprozrazuje verzi. Omezení počtu požadavků je v review ([#338](https://github.com/applifting-vsecourse/team-1/pull/338)), Swagger v produkci čeká na rozhodnutí PO ([#295](https://github.com/applifting-vsecourse/team-1/issues/295)).
- **Sledování:** Dependabot security i version updates, dependency review v PR, denní audit, CodeQL a secret scanning s push protection jsou zapnuté. Akce v GitHub Actions jsou připnuté na SHA commitu.

## Co se od 31. 10. změnilo

| Oblast                           | 31. 10.                                        | 6. 11.                                                                                             | Kde                                                                                                                                                                                                                                                                |
| -------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm audit`                     | 129 (9 kritických, 52 vysokých)                | 5 (0 kritických, 0 vysokých)                                                                       | [#286](https://github.com/applifting-vsecourse/team-1/pull/286), [#327](https://github.com/applifting-vsecourse/team-1/pull/327), [#329](https://github.com/applifting-vsecourse/team-1/pull/329), [#353](https://github.com/applifting-vsecourse/team-1/pull/353) |
| `pnpm audit --prod`              | 114 (6 kritických, 46 vysokých)                | 2 (0 kritických, 0 vysokých)                                                                       | dtto                                                                                                                                                                                                                                                               |
| `better-auth`                    | 1.7.1, kritická chyba                          | 1.7.15                                                                                             | [#286](https://github.com/applifting-vsecourse/team-1/pull/286), [#327](https://github.com/applifting-vsecourse/team-1/pull/327)                                                                                                                                   |
| `next` ve stromu závislostí      | přes `better-auth`, 5 kritických chyb          | odstraněný                                                                                         | [#353](https://github.com/applifting-vsecourse/team-1/pull/353)                                                                                                                                                                                                    |
| `multer`, `qs`, `zod`, `seroval` | pod opravenou verzí                            | 2.5.0, 6.17.1, 4.6.7, 1.7.7                                                                        | [#286](https://github.com/applifting-vsecourse/team-1/pull/286), [#327](https://github.com/applifting-vsecourse/team-1/pull/327), [#329](https://github.com/applifting-vsecourse/team-1/pull/329)                                                                  |
| Bezpečnostní hlavičky            | žádné                                          | CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; backend `helmet` | [#326](https://github.com/applifting-vsecourse/team-1/pull/326)                                                                                                                                                                                                    |
| Nginx                            | `nginx:1.27-alpine`, verze v hlavičce `Server` | `nginx:1.31-alpine`, `server_tokens off`                                                           | [#327](https://github.com/applifting-vsecourse/team-1/pull/327), [#326](https://github.com/applifting-vsecourse/team-1/pull/326)                                                                                                                                   |
| Omezení počtu požadavků          | jen výchozí limit BetterAuth v produkci        | přihláška 20/min a 100/h, přihlášení 5/min, magic link 3/min na IP (v review)                      | [#338](https://github.com/applifting-vsecourse/team-1/pull/338)                                                                                                                                                                                                    |
| Dependabot                       | jen bezpečnostní PR, security updates vypnuté  | security updates zapnuté, týdenní seskupené version updates                                        | [#284](https://github.com/applifting-vsecourse/team-1/pull/284)                                                                                                                                                                                                    |
| Secret scanning                  | vypnutý                                        | zapnutý včetně push protection                                                                     | nastavení repa                                                                                                                                                                                                                                                     |
| CodeQL                           | nebylo                                         | default setup, 4 nálezy opravené, 0 otevřených                                                     | nastavení repa, [#285](https://github.com/applifting-vsecourse/team-1/pull/285), [#288](https://github.com/applifting-vsecourse/team-1/pull/288)                                                                                                                   |
| GitHub Actions                   | připnuté na tag, token s výchozími právy       | připnuté na SHA, `permissions: contents: read`                                                     | [#284](https://github.com/applifting-vsecourse/team-1/pull/284), [#333](https://github.com/applifting-vsecourse/team-1/pull/333)                                                                                                                                   |

## Závislosti

Zdroj: `pnpm audit` a `pnpm audit --prod`.

| Závažnost  | Celkem 31. 10. | Celkem 5. 11. | Celkem 6. 11. | `--prod` 31. 10. | `--prod` 5. 11. | `--prod` 6. 11. |
| ---------- | -------------- | ------------- | ------------- | ---------------- | --------------- | --------------- |
| Kritická   | 9              | 6             | **0**         | 6                | 5               | **0**           |
| Vysoká     | 52             | 31            | **0**         | 46               | 19              | **0**           |
| Střední    | 54             | 30            | 4             | 48               | 23              | 2               |
| Nízká      | 14             | 7             | 1             | 14               | 4               | 0               |
| **Celkem** | **129**        | **74**        | **5**         | **114**          | **51**          | **2**           |

### Kritické zranitelnosti

Všech 9 kritických nálezů z 31. 10.:

| Balíček           | Chyba                                                               | Kde u nás                                                          | Stav                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `better-auth`     | GHSA-965c-763c-88jm: přihlášení za jiného uživatele přes magic link | běží v backendu při každém přihlášení                              | Opraveno ([#286](https://github.com/applifting-vsecourse/team-1/pull/286)). Zneužitelné by bylo jen se zapnutým OAuth, které nemáme. |
| `handlebars` (2×) | spuštění kódu při kompilaci šablony                                 | jen `ts-jest` při testech                                          | Opraveno ([#327](https://github.com/applifting-vsecourse/team-1/pull/327)).                                                          |
| `next` (5×)       | spuštění kódu na serveru, obejití autorizace v middleware           | nainstalovaný jako volitelná závislost `better-auth`, nespouští se | Odstraněno ze stromu ([#353](https://github.com/applifting-vsecourse/team-1/pull/353)). Next.js nepoužíváme.                         |
| `shell-quote`     | command injection ve funkci `quote()`                               | `npm-run-all` ve skriptech `package.json`, bez vstupu uživatele    | Opraveno na 1.11 ([#353](https://github.com/applifting-vsecourse/team-1/pull/353)).                                                  |

Žádná z nich nebyla u nás podle ověřených podmínek zneužitelná: jediná v běžícím kódu vyžadovala OAuth, ostatní byly v kódu, který se nespouští, nebo jen ve vývojových nástrojích.

### Co zůstává

- `glob`, `minimatch` (střední): přes `@nestjs/cli`, jen při buildu backendu. Oprava je jen v nové major verzi, kterou `@nestjs/cli` zatím nepodporuje. Vyřeší ji upgrade na NestJS 12.
- `deepmerge` (nízká): přes `@nestjs/cli`, oprava zatím neexistuje.

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

| Kategorie                 | Stav           | Co jsme našli                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 Řízení přístupu       | Neúplné        | Pravidla `@Auth` a `OrganizationAccessService` existují. Kontrola endpointů jednoho po druhém je [#331](https://github.com/applifting-vsecourse/team-1/issues/331).                                                                                                                                                            |
| A02 Kryptografie          | Bez nálezu     | Hesla a session řeší BetterAuth. Staging běží na HTTPS a posílá HSTS.                                                                                                                                                                                                                                                          |
| A03 Injection             | Bez nálezu     | Ve zdrojích aplikace jen parametrizovaný `$queryRaw`, `$executeRawUnsafe` je jen v seedu a testech. Žádný `dangerouslySetInnerHTML`. CSP zakazuje inline skripty. Validaci všech vstupů jsme neprocházeli.                                                                                                                     |
| A04 Nezabezpečený návrh   | V řešení       | Limit veřejné přihlášky 20 za minutu a 100 za hodinu na IP podle PO je v review ([#338](https://github.com/applifting-vsecourse/team-1/pull/338)). Souvisí s [US-74](https://github.com/applifting-vsecourse/team-1/issues/74).                                                                                                |
| A05 Chybná konfigurace    | Částečně       | Frontend i API posílají bezpečnostní hlavičky, backend má `helmet`, nginx skrývá verzi. Swagger na `/api/docs` je v produkci dál veřejný ([#295](https://github.com/applifting-vsecourse/team-1/issues/295), čeká na PO). Klíč k Resend je v Docker image ([#296](https://github.com/applifting-vsecourse/team-1/issues/296)). |
| A06 Zranitelné komponenty | Bez kritických | Žádná kritická ani vysoká zranitelnost, poslední odstranilo [#353](https://github.com/applifting-vsecourse/team-1/pull/353). Zbývají 4 střední a 1 nízká v nástroji pro build. Viz [Závislosti](#závislosti).                                                                                                                  |
| A07 Autentizace           | V řešení       | Registrace je vypnutá, session platí 7 dní bez návštěvy. Limity přihlášení (heslo 5, magic link 3 za minutu na IP) jsou v review ([#338](https://github.com/applifting-vsecourse/team-1/pull/338)).                                                                                                                            |
| A08 Integrita softwaru    | Bez nálezu     | CI instaluje s `--frozen-lockfile`, GitHub Actions jsou připnuté na SHA commitu, dependency review blokuje PR s novou vysokou nebo kritickou zranitelností.                                                                                                                                                                    |
| A09 Logování a monitoring | Mimo rozsah    | Řeší [US-75](https://github.com/applifting-vsecourse/team-1/issues/75).                                                                                                                                                                                                                                                        |
| A10 SSRF                  | Neověřeno      | Cílenou kontrolu jsme nedělali, je součástí [#331](https://github.com/applifting-vsecourse/team-1/issues/331).                                                                                                                                                                                                                 |

## Sledování zranitelností

Popsané v [`SECURITY.md`](../SECURITY.md). Ve zkratce:

- Dependabot security updates otevírají PR s opravou hned po zveřejnění chyby, version updates každé pondělí seskupeně.
- Workflow [`dependency-review.yml`](../.github/workflows/dependency-review.yml) zablokuje PR, který přidá závislost s vysokou nebo kritickou chybou.
- Workflow [`security-audit.yml`](../.github/workflows/security-audit.yml) denně spustí `pnpm audit` a selže při kritickém nálezu v produkčních závislostech.
- CodeQL kontroluje každý PR, secret scanning s push protection zablokuje push s tajným klíčem.

## Navržené opravy

| #   | Oprava                                                                                   | Stav                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Aktualizovat `better-auth` na ≥ 1.7.7 a zjistit, jestli lze odstranit `next` a `mysql2`. | Hotovo: `better-auth` 1.7.15 ([#286](https://github.com/applifting-vsecourse/team-1/pull/286)), `next` odstraněný ([#353](https://github.com/applifting-vsecourse/team-1/pull/353)), `mysql2` na verzi bez nálezu. |
| 2   | Bezpečnostní hlavičky v nginx, `helmet` v backendu, skrýt verzi nginx.                   | Hotovo ([#326](https://github.com/applifting-vsecourse/team-1/pull/326)).                                                                                                                                          |
| 3   | Omezit počet požadavků na veřejné přihlášce a nastavit limity přihlašování.              | V review ([#338](https://github.com/applifting-vsecourse/team-1/pull/338)).                                                                                                                                        |
| 4   | Vypnout Swagger v produkci, nebo ho záměrně nechat veřejný.                              | Otevřené ([#295](https://github.com/applifting-vsecourse/team-1/issues/295), čeká na PO).                                                                                                                          |
| 5   | Povýšit nginx na podporovanou větev, aktualizovat `multer`, `qs`, `zod` a `seroval`.     | Hotovo ([#286](https://github.com/applifting-vsecourse/team-1/pull/286), [#327](https://github.com/applifting-vsecourse/team-1/pull/327), [#329](https://github.com/applifting-vsecourse/team-1/pull/329)).        |
| 6   | Zapnout Dependabot security updates a secret scanning.                                   | Hotovo ([#284](https://github.com/applifting-vsecourse/team-1/pull/284) a nastavení repa).                                                                                                                         |
| 7   | Projít endpointy jeden po druhém podle A01 a A10.                                        | Otevřené ([#331](https://github.com/applifting-vsecourse/team-1/issues/331)).                                                                                                                                      |
| 8   | Připnout GitHub Actions na SHA commitu.                                                  | Hotovo ([#333](https://github.com/applifting-vsecourse/team-1/pull/333)).                                                                                                                                          |
| 9   | Dostat klíč k Resend z Docker image do proměnných prostředí.                             | Otevřené ([#296](https://github.com/applifting-vsecourse/team-1/issues/296), čeká na přístup do Coolify).                                                                                                          |
| 10  | Odstranit zbylé kritické a vysoké zranitelnosti v závislostech.                          | Hotovo ([#353](https://github.com/applifting-vsecourse/team-1/pull/353)).                                                                                                                                          |

## Jak report zopakovat

```shell
pnpm audit
pnpm audit --prod
curl -sI https://team-1.vsepractical.applifting.dev
curl -sI https://team-1.vsepractical.applifting.dev/api/me
```
