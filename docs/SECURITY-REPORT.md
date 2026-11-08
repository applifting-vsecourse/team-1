# Security report

Stav k 6. 11. 2026. První verze reportu je z 31. 10. 2026 ([US-126](https://github.com/applifting-vsecourse/team-1/issues/219)). Report popisuje stav a nic neopravuje, opravy vznikají jako samostatné issues a PR.

Mezi 5. a 6. 11. sloučené [#353](https://github.com/applifting-vsecourse/team-1/pull/353) odstranilo zbylé kritické a vysoké zranitelnosti v závislostech. Sloupec „5. 11.“ je stav před ním.

## Shrnutí

- **Závislosti:** ze 129 nálezů `pnpm audit` k 31. 10. (9 kritických, 52 vysokých) jich 5. 11. zbývalo 74 a dnes **5: žádný kritický ani vysoký**. Zbylé 4 střední a 1 nízký jsou v nástroji pro build backendu (`@nestjs/cli`).
- **Kritické zranitelnosti:** všech 9 je opravených, posledních 6 odstranilo [#353](https://github.com/applifting-vsecourse/team-1/pull/353). Jediná kritická v kódu, který aplikace spouští (`better-auth`, přihlášení za jiného uživatele), byla opravená jako první. Viz [Kritické zranitelnosti](#kritické-zranitelnosti).
- **Nastavení:** staging i API posílají bezpečnostní hlavičky, nginx neprozrazuje verzi. Omezení počtu požadavků na přihlášku a přihlášení zavedlo [#338](https://github.com/applifting-vsecourse/team-1/pull/338), Swagger v produkci čeká na rozhodnutí PO ([#295](https://github.com/applifting-vsecourse/team-1/issues/295)).
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
| Omezení počtu požadavků          | jen výchozí limit BetterAuth v produkci        | přihláška 20/min a 100/h, přihlášení 5/min, magic link 3/min na IP                                 | [#338](https://github.com/applifting-vsecourse/team-1/pull/338)                                                                                                                                                                                                    |
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
| A01 Řízení přístupu       | Bez nálezu     | Všechny endpointy prošly kontrolou ([#331](https://github.com/applifting-vsecourse/team-1/issues/331)): organizátor nedostane data cizí organizace, účastník cizí přihlášku. Integrační test volá každý endpoint organizátora jako cizí organizátor. Viz [Řízení přístupu po endpointech](#řízení-přístupu-po-endpointech).    |
| A02 Kryptografie          | Bez nálezu     | Hesla a session řeší BetterAuth. Staging běží na HTTPS a posílá HSTS.                                                                                                                                                                                                                                                          |
| A03 Injection             | Bez nálezu     | Ve zdrojích aplikace jen parametrizovaný `$queryRaw`, `$executeRawUnsafe` je jen v seedu a testech. Žádný `dangerouslySetInnerHTML`. CSP zakazuje inline skripty. Validaci všech vstupů jsme neprocházeli.                                                                                                                     |
| A04 Nezabezpečený návrh   | Bez nálezu     | Veřejná přihláška má limit 20 za minutu a 100 za hodinu na IP podle PO ([#338](https://github.com/applifting-vsecourse/team-1/pull/338)). Souvisí s [US-74](https://github.com/applifting-vsecourse/team-1/issues/74).                                                                                                         |
| A05 Chybná konfigurace    | Částečně       | Frontend i API posílají bezpečnostní hlavičky, backend má `helmet`, nginx skrývá verzi. Swagger na `/api/docs` je v produkci dál veřejný ([#295](https://github.com/applifting-vsecourse/team-1/issues/295), čeká na PO). Klíč k Resend je v Docker image ([#296](https://github.com/applifting-vsecourse/team-1/issues/296)). |
| A06 Zranitelné komponenty | Bez kritických | Žádná kritická ani vysoká zranitelnost, poslední odstranilo [#353](https://github.com/applifting-vsecourse/team-1/pull/353). Zbývají 4 střední a 1 nízká v nástroji pro build. Viz [Závislosti](#závislosti).                                                                                                                  |
| A07 Autentizace           | Bez nálezu     | Registrace je vypnutá, session platí 7 dní bez návštěvy. Přihlášení má limit 5 pokusů heslem a 3 magic linky za minutu na IP ([#338](https://github.com/applifting-vsecourse/team-1/pull/338)).                                                                                                                                |
| A08 Integrita softwaru    | Bez nálezu     | CI instaluje s `--frozen-lockfile`, GitHub Actions jsou připnuté na SHA commitu, dependency review blokuje PR s novou vysokou nebo kritickou zranitelností.                                                                                                                                                                    |
| A09 Logování a monitoring | Mimo rozsah    | Řeší [US-75](https://github.com/applifting-vsecourse/team-1/issues/75).                                                                                                                                                                                                                                                        |
| A10 SSRF                  | Bez nálezu     | Server nevolá žádnou adresu ze vstupu uživatele ([#331](https://github.com/applifting-vsecourse/team-1/issues/331)). Viz [SSRF](#ssrf).                                                                                                                                                                                        |

## Řízení přístupu po endpointech

Kontrola z [#331](https://github.com/applifting-vsecourse/team-1/issues/331) k 6. 11. 2026: každý endpoint z `apps/backend/src/modules/*/controllers`, bez BetterAuth pod `/api/auth/*` (černá skříňka). Cesty jsou pod `/api`.

- **Ochrana:** `ORGANIZER` a `PARTICIPANT` je `@Auth('ORGANIZER')` / `@Auth('PARTICIPANT')` na controlleru (bez session 401, jiný typ účtu 403), `@Auth()` pustí kohokoliv přihlášeného, „veřejný“ je bez dekorátoru.
- **Organizace:** jak endpoint omezí data na organizace přihlášeného organizátora. `akce` = `assertCanAccessEvent`, `přihláška` = `assertCanAccessApplication`, `seznam` = `getOrganizationIds`. Vnořené id (termín, pokoj, žádost o změnu, doklad o platbě, přihlášky v hromadné akci) repository hledá jen v té akci nebo přihlášce a jejich organizaci.
- **Identita:** uživatel vždy z `@User()` (session). Žádné tělo požadavku nenese id uživatele ani autora, `organizationId` při založení akce se ověří přes `assertCanAccessOrganization`.
- **Test:** pro organizátora [`organization-isolation.int-spec.ts`](../apps/backend/src/shared/organization-access/organization-isolation.int-spec.ts) zavolá každý endpoint jako organizátor jiné organizace a čeká 403 s tělem jen `{ statusCode, code, message }` a beze změny dat organizace. Druhá část podstrčí cizí vnořené id pod vlastní akci nebo přihlášku.

### Organizátor

| Controller                         | Metoda a cesta                                                                                            | Ochrana     | Organizace                                  | Výsledek |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------- | -------- |
| `OrganizerEventsController`        | `POST /organizer/events`                                                                                  | `ORGANIZER` | `assertCanAccessOrganization`, jinak jediná | OK       |
|                                    | `GET /organizer/events`                                                                                   | `ORGANIZER` | seznam                                      | OK       |
|                                    | `GET`, `DELETE /organizer/events/:eventId`                                                                | `ORGANIZER` | akce                                        | OK       |
|                                    | `PUT …/public-page`, `PATCH …/evaluation-mode`, `PUT …/cancellation-start`                                | `ORGANIZER` | akce                                        | OK       |
|                                    | `GET`, `PUT`, `DELETE …/photo`                                                                            | `ORGANIZER` | akce                                        | OK       |
| `OrganizerTermsController`         | `GET`, `POST /organizer/events/:eventId/terms`, `PATCH …/:termId`, `POST …/:termId/cancel`                | `ORGANIZER` | akce, termín akce                           | OK       |
| `RoomsController`                  | `GET …/terms/:termId/rooms`, `PATCH …/room-mode`, `POST …/rooms`, `PUT`, `DELETE …/rooms/:id`             | `ORGANIZER` | akce, termín a pokoj organizace             | OK       |
| `CapacityController`               | `GET /organizer/events/:eventId/capacity`, `GET …/capacity/details`                                       | `ORGANIZER` | akce                                        | OK       |
| `ApplicationListController`        | `GET /organizer/events/:eventId/applications`                                                             | `ORGANIZER` | akce                                        | OK       |
| `OccupancyController`              | `GET /organizer/events/:eventId/occupancy`                                                                | `ORGANIZER` | akce                                        | OK       |
| `OrganizerChangeRequestController` | `GET /organizer/events/:eventId/change-requests`, `GET …/:requestId`, `PATCH …/approve`, `PATCH …/reject` | `ORGANIZER` | akce, žádost akce                           | OK       |
| `BulkConfirmationController`       | `POST …/terms/:termId/bulk-confirmation/preview`, `POST …/bulk-confirmation`                              | `ORGANIZER` | akce, cizí přihlášky zůstanou beze změny    | OK       |
| `BulkDecisionController`           | `POST …/terms/:termId/bulk-decision`                                                                      | `ORGANIZER` | akce, cizí přihlášky zůstanou beze změny    | OK       |
| `SubstitutesController`            | `GET …/terms/:termId/substitutes`, `GET …/history`, `POST …/:applicationId/confirm`                       | `ORGANIZER` | akce, termín akce (cizí 404)                | OK       |
| `TermStatusController`             | `GET /organizer/applications/:applicationId/terms`, `PATCH …/:termId/status`                              | `ORGANIZER` | přihláška, termín přihlášky (cizí 404)      | OK       |
| `OrganizerTermChangeController`    | `GET …/terms/change-options`, `GET …/terms/change-preview`, `PUT …/terms`                                 | `ORGANIZER` | přihláška                                   | OK       |
| `PaymentsController`               | `GET`, `POST /organizer/applications/:applicationId/payments`, `POST …/refunds`                           | `ORGANIZER` | přihláška                                   | OK       |
|                                    | `POST …/:receiptId/preview`, `PATCH`, `DELETE …/:receiptId`                                               | `ORGANIZER` | přihláška, doklad přihlášky                 | OK       |
| `OrganizerProfileController`       | `GET /organizer/profile`                                                                                  | `ORGANIZER` | jen vlastní účet                            | OK       |

### Účastník a každý přihlášený

Data účastníka se hledají podle `userId` ze session, cizí přihláška nebo žádost vrací 403.

| Controller                                        | Metoda a cesta                                                                   | Ochrana       | Omezení                       | Test                                              | Výsledek |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ------------- | ----------------------------- | ------------------------------------------------- | -------- |
| `MyApplicationsController`                        | `GET /participant/applications`, `GET …/:id`                                     | `PARTICIPANT` | přihlášky uživatele           | `my-applications.int-spec.ts`                     | OK       |
| `ParticipantTermChangeController`                 | `GET /participant/applications/:applicationId/change-options`, `PUT …/terms`     | `PARTICIPANT` | přihláška uživatele           | `participant-term-change.int-spec.ts`             | OK       |
| `ParticipantChangeRequestController`              | `GET`, `POST /participant/applications/:applicationId/change-requests`           | `PARTICIPANT` | přihláška uživatele           | `change-request.int-spec.ts`                      | OK       |
| `ParticipantChangeRequestNotificationsController` | `GET /participant/change-request-notifications`, `PATCH …/:requestId/read`       | `PARTICIPANT` | žádosti uživatele             | `change-request.int-spec.ts`                      | OK       |
| `ParticipantPasswordController`                   | `POST /participant/password`                                                     | `@Auth()`     | vlastní účet, organizátor 403 | `participant-password.int-spec.ts`                | OK       |
| `MeController`                                    | `GET`, `PATCH /me`, `POST /me/email-change`                                      | `@Auth()`     | vlastní účet                  | `account.int-spec.ts`, `email-change.int-spec.ts` | OK       |
| `NotificationsController`                         | `GET /notifications`, `GET …/unread-count`, `POST …/read-all`, `POST …/:id/read` | `@Auth()`     | oznámení uživatele, cizí 404  | `notifications.int-spec.ts`                       | OK       |

### Veřejné endpointy

| Controller                   | Metoda a cesta                                        | Proč je veřejný                                                                                                                                              | Výsledek |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `ApplicationsController`     | `POST /public/events/:publicToken/applications`       | Přihlášku podává zájemce bez účtu z odkazu akce. Limit 20 za minutu a 100 za hodinu na IP ([#338](https://github.com/applifting-vsecourse/team-1/pull/338)). | OK       |
| `PublicEventsController`     | `GET /public/events/:publicToken`                     | Formulář přihlášky z odkazu akce. Token je náhodný, vrací jen název, popis, místo a termíny s cenami.                                                        | OK       |
| `PublicCatalogController`    | `GET /public/catalog`                                 | Katalog akcí, jen akce zveřejněné organizátorem.                                                                                                             | OK       |
|                              | `GET /public/events/:publicToken/page`, `GET …/photo` | Veřejná stránka akce a její fotka pro odkaz akce.                                                                                                            | OK       |
| `SubmissionStatusController` | `GET /public/applications/:accessToken`               | Stav přihlášky z e-mailu bez účtu. Tajný `accessToken` je pověření ([PROJEKT.md, kap. 10](PROJEKT.md)).                                                      | OK       |
| `WelcomeController`          | `GET /`, `GET /health`                                | Rozcestník API a kontrola stavu pro nasazení, nevrací žádná data.                                                                                            | OK       |

### Nálezy

- Žádný endpoint nepustí organizátora k datům cizí organizace ani účastníka k cizí přihlášce.
- Cizí vnořené id pod vlastní akcí nebo přihláškou odpovídá u náhradníků a stavu přihlášky v termínu 404 místo 403, stejně jako neexistující id. Nic neprozradí a takhle to chtějí stávající testy (`substitutes.int-spec.ts`, `term-status.int-spec.ts`), proto beze změny.

## SSRF

Kontrola z [#331](https://github.com/applifting-vsecourse/team-1/issues/331) k 6. 11. 2026: server nikde nevolá adresu převzatou ze vstupu uživatele.

- **Odchozí volání:** jen e-mail přes Resend (pevná adresa API v SDK) nebo SMTP (server z proměnných prostředí). Žádný `fetch`, `axios` ani jiný HTTP klient v kódu aplikace, žádné webhooky.
- **Obrázky:** fotka veřejné stránky se nahrává jako bajty v těle požadavku, server nic nestahuje.
- **Odkazy v e-mailech:** skládají se z `FRONTEND_URL` v konfiguraci, nikdy z hlavičky `Host` nebo z požadavku.
- **Přesměrování:** aplikace sama nepřesměrovává. `callbackURL` u přihlášení přes BetterAuth omezuje `trustedOrigins` na `FRONTEND_URL`.

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
| 3   | Omezit počet požadavků na veřejné přihlášce a nastavit limity přihlašování.              | Hotovo ([#338](https://github.com/applifting-vsecourse/team-1/pull/338)).                                                                                                                                          |
| 4   | Vypnout Swagger v produkci, nebo ho záměrně nechat veřejný.                              | Otevřené ([#295](https://github.com/applifting-vsecourse/team-1/issues/295), čeká na PO).                                                                                                                          |
| 5   | Povýšit nginx na podporovanou větev, aktualizovat `multer`, `qs`, `zod` a `seroval`.     | Hotovo ([#286](https://github.com/applifting-vsecourse/team-1/pull/286), [#327](https://github.com/applifting-vsecourse/team-1/pull/327), [#329](https://github.com/applifting-vsecourse/team-1/pull/329)).        |
| 6   | Zapnout Dependabot security updates a secret scanning.                                   | Hotovo ([#284](https://github.com/applifting-vsecourse/team-1/pull/284) a nastavení repa).                                                                                                                         |
| 7   | Projít endpointy jeden po druhém podle A01 a A10.                                        | Hotovo ([#331](https://github.com/applifting-vsecourse/team-1/issues/331)).                                                                                                                                        |
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
