# Togena — projektový dokument

Živý dokument týmu 1 (4IT580). Shrnuje, co stavíme, co je rozhodnuté a podle čeho pokračujeme.

- **Board** je zdroj pravdy pro **rozsah** (co se dělá a v jakém sprintu).
- **Tento soubor** je zdroj pravdy pro **rozhodnutí a pravidla** (jak se to dělá).
- Když se tyto dva zdroje rozcházejí, platí rozhodnutí zapsané tady, dokud ho tým nebo PO nezmění. Rozdíly vůči boardu jsou v sekci 11.

Když se něco rozhodne (v týmu, s PO, s klientem), zapíše se do sekce 10 s datem.

---

## 1. O čem projekt je

**Togena** je platforma pro pořadatele vícetermínových akcí (letní kempy, soustředění, LARP tábory, firemní výjezdy). Nahrazuje Google tabulky, ruční počítání kapacit a párování plateb.

Problém klienta: přihlášky se otevírají v jeden okamžik (7. 2. 2027 ve 20:00), do druhého dne je plno a organizátor ručně počítá, kdo se vejde do dámských a pánských pokojů, kdo je náhradník a kdo kolik dluží.

Jádro MVP:

1. Organizátor založí akci s více termíny, cenou za termín a pokoji (dámský / pánský, kapacita).
2. Rozešle neuhodnutelný odkaz; zájemce vyplní krátkou přihlášku na mobilu **bez registrace** a vybere termíny.
3. Systém každý termín vyhodnotí zvlášť — potvrzený, nebo náhradník — podle volných lůžek pro jeho pohlaví, v pořadí přijetí na serveru.
4. Přihlašovatel hned vidí stav a platební údaje (částka, účet, VS); e-mailem dostane odkaz do svého účtu.
5. Organizátor vidí obsazenost po termínech, seznam přihlášek s filtry a ručně zapisuje platby.

## 2. Odkazy a přístupy

| Co                       | Kde                                                               |
| ------------------------ | ----------------------------------------------------------------- |
| Repozitář                | https://github.com/applifting-vsecourse/team-1                    |
| Board (GitHub Project)   | https://github.com/orgs/applifting-vsecourse/projects/12          |
| Zkušební prostředí       | https://team-1.vsepractical.applifting.dev (deploy z `main`)      |
| Logy aplikace            | https://logs.vsepractical.applifting.dev (login `team-1`)         |
| Databáze (Adminer)       | https://db.vsepractical.applifting.dev (uživatel i DB `team_1`)   |
| Wireframy low-fi (Figma) | https://www.figma.com/design/u8KvMjM9VxIU48OG7Wtkdc               |
| Wireframy hi-fi (Figma)  | https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system |

- Hesla do logů a DB má tech lead; do repozitáře nepatří.
- **Do Coolify (env proměnné stagingu) přístup nemáme.** Prostředí spravuje kurz. Viz otevřené body.

## 3. Tým

**Klient:** [tomaskriz-max](https://github.com/tomaskriz-max) — vlastník produktu, pro kterého Togenu stavíme; není členem týmu.

| Člen                                              | Role            | Poznámka                                         |
| ------------------------------------------------- | --------------- | ------------------------------------------------ |
| [kudrle01](https://github.com/kudrle01)           | Technical lead  | technický základ (fáze 0, US-71, US-72)          |
| [Jakubkuba9000](https://github.com/Jakubkuba9000) | Designer        | wireframy; na boardu přiřazená většina sprintu 1 |
| [Aadikk](https://github.com/Aadikk)               | Product manager | US-77                                            |
| [PJjiry](https://github.com/PJjiry)               | Tester          |                                                  |

## 4. Board

- **91 položek**, všechno issues v tomto repu ve formátu `US-xx Název` podle `.github/ISSUE_TEMPLATE/user-story.md`.
- **Status:** Backlog → Ready → In progress → In review → Done. Pole Size (XS–XL), Estimate a Sprint (iterace) existují, zatím nevyplněná.
- **Štítky:**
  - `epic: …` — 11 epiců (účty, nastavení akce, přihlašování na akce, platby, ubytování, přehledy, komunikace, ekonomika, logistika, platforma, technický základ)
  - `priority: MVP` / `priority: nice to have`
  - `sprint 1` — osekané MVP pro první sprint
  - designový tok: `ready to design` → `design done`
- Uzavřené (vypuštěné podle finálního feature breakdownu): US-17 zálohy, US-48 doúčtování, US-50 platba kartou, US-63 nahrání dokumentu, US-67 oddíly.
- Každá story má sekci **Mimo rozsah** — co tam je, se v dané story nedělá (ani agentem).

## 5. Sprint 1 — rozsah

| Story | Název                                        | Proud          |
| ----- | -------------------------------------------- | -------------- |
| US-71 | Datový model a ukázková data                 | 0              |
| US-72 | Zkušební prostředí a automatické nasazování  | 0              |
| US-73 | Automatické testy klíčových výpočtů          | 0 + B + D      |
| US-12 | Založení akce a odkaz na přihlášku           | A              |
| US-13 | Termíny akce                                 | A              |
| US-16 | Cena termínů                                 | A              |
| US-14 | Pokoje s kapacitou                           | A              |
| US-26 | Kapacita termínu z pokojů podle pohlaví      | 0 (logika) + B |
| US-23 | Přihláška přes odkaz                         | B              |
| US-40 | Cena přihlášky                               | 0 (logika) + B |
| US-27 | Automatické potvrzení podle kapacity         | B              |
| US-25 | Stav a platební údaje po odeslání            | B              |
| US-02 | Přihlášení a odhlášení                       | C              |
| US-01 | Přístup přihlašovatele po odeslání přihlášky | C              |
| US-56 | Potvrzovací e-mail                           | C              |
| US-04 | Nastavení hesla přihlašovatele               | C              |
| US-54 | Moje přihláška                               | C              |
| US-10 | Oddělení dat mezi organizacemi               | 0 (guardy) + D |
| US-52 | Seznam přihlášek s filtry                    | D              |
| US-44 | Zápis platby                                 | D              |
| US-29 | Obsazenost po termínech                      | D              |
| US-96 | Landing page produktu                        | kdokoliv       |

Klíčová čísla z akceptačních kritérií (musí sedět v testech):

- Kapacita termínu pro ženy = součet kapacit dámských pokojů, pro muže = pánských. 10 + 10 pokojů po 5 místech pojme 50 + 50, **ne** 52 + 48.
- Pokoj: kapacita 1–20, příznak dámský / pánský povinný, platí pro všechny termíny akce.
- Přihláška se uloží vždy, i když je plno. Termíny se vyhodnocují zvlášť v pořadí přijetí na serveru. Dvě souběžné přihlášky nikdy nepřekročí kapacitu.
- Částka k úhradě = součet cen **potvrzených** termínů. Dluží = k úhradě − zaplaceno. Zaplaceno bez částky = celá částka k úhradě.
- Variabilní symbol = číslo přihlášky.
- Odkaz na přihlášku funguje, až má akce aspoň jeden termín s cenou a aspoň jeden pokoj.
- Formulář přihlášky funguje na 360 px bez vodorovného posunu. Tlačítko Odeslat je po stisku neaktivní.
- Cizí záznam přes URL i API vrací **403** a nic z obsahu.
- Vlastní heslo přihlašovatele má aspoň 8 znaků.

## 6. Plán práce ve sprintu 1

### Fáze 0 — základ (tech lead, blokuje ostatní)

Tři PR za sebou:

1. **Čistá šablona** — pryč s Quackerem, přejmenování na Togenu, struktura FE (atomic) a BE (moduly), layouty a kostra rout pro všechny tři části, README, LICENSE, CONTRIBUTING, PR šablona, oprava CI.
2. **US-71 + doména** — kompletní Prisma schéma pro sprint 1, seed (2 organizace, organizátoři, ukázková akce), typ účtu a guardy rolí, kontrola přístupu k organizaci (příprava US-10), čisté doménové funkce pro kapacitu, vyhodnocení a cenu s unit testy (50+50 / 52+48).
3. **US-72** — seed na stagingu, integrační testy proti Postgresu v CI, adresa stagingu v README.

### Fáze 1 — paralelně (vertikální řezy, každý dělá BE + FE + testy své story)

Vyvíjí celý tým, včetně designera, product managera a testera. Každý vlastní jeden proud.

```
A  Nastavení akce + landing   Jakubkuba9000   US-12 → US-13 + US-16 → US-14; US-96
B  Přihláška                  kudrle01        US-23 + US-40 (UI) → US-27 (uložení + souběh) → US-25
C  Účty a e-mail              PJjiry          US-02 → US-01 + US-56 → US-04 → US-54
D  Přehledy                   Aadikk          US-10 (testy izolace) → US-52 + US-44 → US-29
```

Proč takhle: B obsahuje nejtěžší logiku (souběh, vyhodnocení), proto ho má tech lead. A je nejvíc UI podle vlastních wireframů. D jsou seznamy a platby, kde product manager nejlíp zná požadavky. C má nejvíc okrajových stavů (existující účet, kolize e-mailu, vypršelý odkaz), které tester vidí nejlíp.

B, C a D nečekají na UI z proudu A: schéma je hotové ve fázi 0 a data jsou v seedu.

### Kdo sahá kam (aby se proudy nepraly o soubory)

| Proud | Kdo           | Backend                                                                    | Frontend                                |
| ----- | ------------- | -------------------------------------------------------------------------- | --------------------------------------- |
| A     | Jakubkuba9000 | `modules/events` (akce, termíny, pokoje)                                   | `features/events`, `features/landing`   |
| B     | kudrle01      | `modules/applications` — veřejné endpointy, vyhodnocení, souběh            | `features/application-form`             |
| C     | PJjiry        | `modules/participants`, magic link v `shared/auth`, šablony v `core/email` | `features/auth`, `features/participant` |
| D     | Aadikk        | `modules/payments`, `modules/overview` (obsazenost, seznam přihlášek)      | `features/event-overview`               |

Sdílené soubory (`schema.prisma`, `app.module.ts`, `routes.ts`, `components/*`) mění autor jen v rozsahu své story a v PR na to upozorní.

### Styčné body

- **B → C:** po uložení přihlášky `ApplicationsService` zavolá `ParticipantAccountsService.ensureAccount(email)` a `MailService.sendApplicationConfirmation(...)`. Ve fázi 0 vzniknou rozhraní; C dodá implementaci, B do té doby volá no-op.
- **B ↔ D:** stav termínů, částka k úhradě a dluh se počítají jen v doménových funkcích z fáze 0 (`modules/applications/domain`). Nikdo je nepočítá znovu po svém.

## 7. Slovník (doména → kód)

Kód, DB, API i URL anglicky; texty v UI a e-mailech lokalizované (EN / CZ); dokumentace česky.

Slovník pojmů business domény včetně mapování na kód (sloupec „V kódu“), kolizí pojmů a rozpory mezi zdroji je v [SLOVNIK.md](SLOVNIK.md). Nové pojmy se přidávají tam.

## 8. Datový model (US-71)

```
User (BetterAuth)     accountType: ORGANIZER | PARTICIPANT | ADMIN, mustSetPassword (obojí v session)
Organization          name, bankAccount
OrganizationMember    userId, organizationId                       (M:N, organizátor ↔ organizace)
Event                 organizationId, name, description?, location?, publicToken (unikátní, neuhodnutelný)
Term                  organizationId, eventId, name, startsOn, endsOn, priceCzk
Room                  organizationId, eventId, name, capacity (1–20), gender
Application           organizationId, eventId, userId (účet přihlašovatele), number (VS, sekvence),
                      accessToken (stránka potvrzení), firstName, lastName, birthDate, gender, email,
                      consentAt, submittedAt
ApplicationTerm       applicationId, termId, status, priceCzk (zmrazená cena), evaluatedAt
Payment               organizationId, applicationId, amountCzk, recordedById, createdAt
```

- Každá tabulka s daty organizace má **přímý** `organizationId` — izolace (US-10) je pak jeden filtr.
- Peníze jako celé číslo v Kč (`Int`).
- `Application.number` je globální autoincrement → VS.
- Cena se při vyhodnocení zkopíruje do `ApplicationTerm.priceCzk`; pozdější změna ceny termínu se týká jen nových přihlášek.
- `Application.userId` je nullable: přihláška se uloží, i když účet přihlašovatele ještě nevznikl (proud C).
- Veřejná registrace (`/api/auth/sign-up`) je vypnutá. Účty vznikají jen na serveru (seed, přihláška).
- Platby jsou řádky (`Payment`), ne příznak na přihlášce — připraveno na import z banky (US-42). Ve sprintu 1 UI zapíše nebo smaže jednu platbu; „zaplaceno bez částky“ uloží aktuální částku k úhradě.

## 9. Architektura

### Routy (URL anglicky, stejné pro oba jazyky)

```
Veřejné
  /                                    landing (US-96)
  /apply/$token                        formulář přihlášky (US-23)
  /apply/confirmation/$accessToken     stav a platební údaje (US-25)

Přihlášení
  /organizer/login                     e-mail + heslo (S01)
  /participant/login                   e-mail + heslo, nebo „pošlete mi odkaz“ (S10)
  /participant/set-password            povinně po prvním vstupu odkazem (S09)

Organizátor (jen ORGANIZER, jinak 403)
  /organizer                           dashboard (O01)
  /organizer/events                    akce seskupené podle pořadatele (O02)
  /organizer/events/new
  /organizer/events/$eventId           přehled a obsazenost (US-29)
  /organizer/events/$eventId/terms
  /organizer/events/$eventId/rooms
  /organizer/events/$eventId/applications
  /organizer/account

Přihlašovatel (jen PARTICIPANT)
  /participant                         moje přihláška (US-54)
  /participant/account
```

Organizace v URL není. Přístup se ověřuje přes členství v organizaci, které akce patří.

### API (EN, prefix `/api`)

```
/auth/*                                    BetterAuth (černá skříňka)
/me                                        přihlášený uživatel včetně accountType
/public/events/:publicToken                akce + termíny s cenami pro formulář
/public/events/:publicToken/applications   POST odeslání přihlášky
/public/applications/:accessToken          stránka potvrzení
/organizer/events[/:eventId]               akce
/organizer/events/:eventId/terms[/:id]     termíny
/organizer/events/:eventId/rooms[/:id]     pokoje
/organizer/events/:eventId/applications    seznam s filtry ?termId&status&paid
/organizer/events/:eventId/occupancy       obsazenost
/organizer/applications/:id/payments[/:id] zápis a zrušení platby
/participant/applications                  moje přihlášky
/participant/password                      POST první heslo přihlašovatele (US-04)
```

### Lokalizace (EN / CZ)

- **Frontend:** i18next + react-i18next. Výchozí jazyk je angličtina; při první návštěvě rozhoduje jazyk prohlížeče (český prohlížeč → čeština). Přepínač v hlavičce, volba se pamatuje v `localStorage` (`togena.language`). URL jsou pro oba jazyky stejné.
- **Překlady:** `apps/frontend/src/i18n/locales/{en,cs}/<namespace>.json`, jeden namespace na feature složku (`events`, `applicationForm`, `participant`, `eventOverview`, `auth`, `landing`) + `common` a `errors`. Každý proud edituje svoje soubory. Klíče jsou typově kontrolované proti angličtině a test hlídá, že obě jazykové verze mají stejné klíče.
- **Formáty:** peníze a data přes `formatCzk` / `formatDate` v `lib/`, podle aktuálního jazyka (`1 500 Kč` / `CZK 1,500`).
- **Chyby z API:** backend vrací `{ statusCode, code, message }`; frontend přeloží `code` přes `errors.json`. Nový kód = `shared/errors/error-code.ts` + oba `errors.json`.
- **Jazyk požadavku:** frontend posílá `Accept-Language`, backend ho čte dekorátorem `@RequestLocale()`.
- **E-maily:** v jazyce účtu (`User.locale`) nebo přihlášky (`Application.locale`, uloží se při odeslání z `@RequestLocale()`). Šablony mají texty obou jazyků vedle sebe (`core/email/templates`).

### Backend (NestJS)

```
apps/backend/src/
  core/               infrastruktura použitelná v jakékoli aplikaci (prisma, email)
  shared/             průřezové věci této aplikace (auth, guardy rolí, přístup k organizaci, config)
  modules/<modul>/
    <modul>.module.ts
    controllers/      HTTP vrstva; dto/ (class-validator + Swagger)
    services/         aplikační logika, transakce
    repositories/     jediné místo, kde se sahá na Prismu
    domain/           typy a čisté funkce — testují se bez DB
  scripts/seed/
```

- Autor záznamu se bere ze session, nikdy z body (vzor ze starteru).
- Guardy: `AuthenticatedUserGuard` (401), `AccountTypeGuard` s dekorátorem `@AccountTypes(...)` (403), `OrganizationAccessService.assertCanAccessEvent(user, eventId)` (403 bez obsahu).
- **Souběh (US-27):** odeslání přihlášky běží v jedné transakci; nejdřív zamkne řádky vybraných termínů (`SELECT … FOR UPDATE`, seřazené podle id kvůli deadlockům), pak spočítá volná místa a zapíše stavy. Čas přijetí určuje server.
- Testy: `*.spec.ts` = unit (bez DB), `*.int-spec.ts` = integrační proti Postgresu (souběh, izolace, API).

### Frontend (React)

Alias `@/` → `src/` funguje ve FE i BE. ESLint zakazuje relativní importy kromě sourozenců a importy mezi features.

```
apps/frontend/src/
  app/                router, providers, ROUTES
  routes/             TanStack file-based routy — tenké: načtou data, složí stránku z template + organismů
  components/
    ui/               vendored shadcn — nesahat, přidávat přes `pnpm dlx shadcn@latest add`
    atoms/            nejmenší vlastní prvky bez byznys logiky (MoneyAmount, StatusBadge, GenderLabel)
    molecules/        složení atomů (FormField, StatTile, CopyLinkButton)
    organisms/        samostatné bloky (Header, EmptyState, ErrorState, DataTable)
    templates/        layouty (PublicLayout, AuthLayout, AreaLayout pro organizátora i přihlašovatele, ErrorLayout)
    pages/            systémové stránky bez routy (404, 403, chyba, načítání)
  features/<feature>/ api/ (zod schémata + queryOptions), hooks/, components/ (doménové bloky)
  config/ hooks/ lib/ styles/
```

- `components/**` neví nic o doméně a neimportuje z `features/` (hlídá ESLint).
- Feature komponenty skládají `components/**` a `ui/**`.
- Veřejná část a část přihlašovatele jsou **mobile-first** (360 px), organizátorská **desktop-first**.
- Tokeny (barvy, font, radius) se převezmou z Figma design systému do `global.css`; pravidla z `DESIGN.md` platí dál. Když se Figma s pravidlem pere, rozhoduje tech lead.

## 10. Rozhodnutí

| Datum      | Rozhodnutí                                                                                                                                                                                                                                                                          | Kdo       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| (board)    | Akce = jeden celek s více termíny, každý termín se vyhodnocuje zvlášť.                                                                                                                                                                                                              | klient    |
| (board)    | Potvrzování je automatické.                                                                                                                                                                                                                                                         | tým       |
| (board)    | Platby bez brány a bez banky — ruční zápis. Platí se celá částka, bez záloh.                                                                                                                                                                                                        | klient    |
| (board)    | Organizátorské účty ve sprintu 1 vznikají v seedu, ne registrací.                                                                                                                                                                                                                   | tým       |
| 2026-10-16 | **Produkt se jmenuje Togena** (dříve pracovně kemp.io). Název platí v UI, e-mailech, dokumentaci i technických identifikátorech (compose projekt, DB `togena`).                                                                                                                     | tech lead |
| 2026-10-16 | **Ve sprintu 1 se nikdo neregistruje.** Landing má dva vstupy: „Pro organizátory – přihlásit se“ a „Mám přihlášku – přihlásit se“. Účet účastníka vzniká odesláním přihlášky.                                                                                                       | tech lead |
| 2026-10-19 | Landing má podle Figmy (V08, M07) jediný vstup „Pro organizátory – přihlásit se“; ruší se tím druhý vstup z rozhodnutí 16. 10. Účastník se na přihlášení (S10) dostane odkazem z přihlášení organizátora (S01) nebo z e-mailu.                                                      | tým       |
| 2026-10-19 | Redesign (PR #112): landing má dva vstupy „Jsem organizátor“ a „Jsem účastník“. **Landing je jen pro nepřihlášené** — přihlášeného uživatele `/` (i klik na logo) přesměruje na jeho domovskou stránku (dashboard / moje přihlášky); na landing se dostane po odhlášení.            | tým       |
| 2026-10-20 | Redesign se dělá v původním Figma souboru a v původních barvách (DS / Semantic), barvy „Future Teal“ se nepoužívají. Rohy loga značí jen jednu aktivní věc (položka sidebaru, záložka, krok, karta akce). Pravidla: `docs/FIGMA-REMAKE.md`.                                         | tech lead |
| 2026-10-16 | **Jeden typ na účet** (`ORGANIZER` / `PARTICIPANT` / `ADMIN`). Jeden e-mail nemůže být organizátor i účastník.                                                                                                                                                                      | tech lead |
| 2026-10-16 | **Účastník dostává magic link místo jednorázového hesla.** Odkaz platí 7 dní a jde použít jednou. První vstup odkazem vynutí nastavení vlastního hesla (min. 8 znaků); dál se přihlašuje heslem. Na S10 si může nechat poslat nový odkaz. Magic link funguje jen pro `PARTICIPANT`. | tech lead |
| 2026-10-16 | Existuje-li účet účastníka k e-mailu, nová přihláška se k němu přiřadí a e-mail obsahuje odkaz na přihlášení (bez vynuceného nastavení hesla, pokud ho už má).                                                                                                                      | tech lead |
| 2026-10-16 | Odkaz na přihlášku = neuhodnutelný token `/apply/<token>`.                                                                                                                                                                                                                          | tech lead |
| 2026-10-16 | Stránka po odeslání má tajnou URL `/apply/confirmation/<accessToken>`, takže přežije obnovení a může být v e-mailu.                                                                                                                                                                 | tech lead |
| 2026-10-16 | Další přihláška se stejným e-mailem na stejnou akci je povolená (přiřadí se k účtu).                                                                                                                                                                                                | tech lead |
| 2026-10-16 | E-mail organizátora v přihlášce → chyba u pole „Tento e-mail nelze použít pro přihlášku, zadej jiný.“                                                                                                                                                                               | tech lead |
| 2026-10-16 | Pokles kapacity pod počet potvrzených je povolený; zobrazí se přebookování. Nikdo se automaticky nepřesouvá — ani dolů, ani nahoru (US-28, US-31 později). Nové přihlášky jdou mezi náhradníky.                                                                                     | tech lead |
| 2026-10-16 | Cena termínu se při vyhodnocení zmrazí do `ApplicationTerm.priceCzk`.                                                                                                                                                                                                               | tech lead |
| 2026-10-16 | Peníze jako celé Kč (`Int`). VS = globální sekvence `Application.number`. Platby jako řádky `Payment`.                                                                                                                                                                              | tech lead |
| 2026-10-21 | E-maily: na stagingu jdou přes **Resend** (klíč z GitHub secretu `RESEND_API_KEY` jako build-arg do image, odesílatel `onboarding@resend.dev`, doručuje jen na adresu Resend účtu `togena.team1@gmail.com`), lokálně do konzole.                                                    | tech lead |
| 2026-10-16 | Staging: seed běží při každém startu backendu a je idempotentní (přeskočí se, když v DB je organizace). Selhání seedu start nezastaví. Reset stagingu: v Admineru `TRUNCATE organization CASCADE` a ručně spustit workflow Build & Deploy.                                          | tech lead |
| 2026-10-16 | Celé schéma pro sprint 1 vzniká ve fázi 0. Kdo přesto potřebuje migraci: max. jedna na PR, před mergem rebase na `main` a migraci vygenerovat znovu.                                                                                                                                | tech lead |
| 2026-10-16 | Testy: unit (`*.spec.ts`, bez DB) + integrační (`*.int-spec.ts`) proti sestavenému serveru a Postgresu; v CI jako service container, lokálně v DB `togena_test`.                                                                                                                    | tech lead |
| 2026-10-16 | Organizace není v URL; akce jsou seskupené podle pořadatele.                                                                                                                                                                                                                        | tech lead |
| 2026-10-16 | Stack zůstává ze starteru. FE podle atomic designu (globální `components/{atoms,molecules,organisms,templates}` + `features/`), shadcn zůstává v `components/ui`.                                                                                                                   | tech lead |
| 2026-10-16 | Tokeny z Figmy, pravidla z DESIGN.md.                                                                                                                                                                                                                                               | tech lead |
| 2026-10-16 | Licence MIT: zachovat copyright autorů starteru + přidat tým.                                                                                                                                                                                                                       | tech lead |
| 2026-10-16 | Jazyk: kód, DB, API, **URL**, commity a komentáře anglicky; dokumentace, issues a PR česky. Texty v UI a e-mailech jsou **lokalizované EN / CZ** (viz sekce 9, Lokalizace).                                                                                                         | tech lead |
| 2026-10-16 | Práce po vertikálních řezech: kdo vezme story, dělá BE + FE + testy.                                                                                                                                                                                                                | tech lead |
| 2026-10-16 | Vyvíjí celý tým. Proudy: A + landing Jakubkuba9000, B kudrle01, C PJjiry, D Aadikk. Story schvaluje product manager Aadikk.                                                                                                                                                         | tech lead |
| 2026-10-16 | Git: viz sekce 12.                                                                                                                                                                                                                                                                  | tech lead |

## 11. Rozdíly vůči boardu

PO změnu potvrdil 2026-10-19, issues jsou upravené 2026-10-21. Tabulka zůstává pro dohledání původního zadání.

| Story | Board říká                                                        | Platí                                                                           |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| US-01 | E-mail obsahuje přihlašovací jméno a jednorázové heslo.           | E-mail obsahuje magic link (7 dní, jednorázový).                                |
| US-04 | Účastník zadá e-mail + jednorázové heslo a nastaví vlastní heslo. | Po vstupu odkazem je nastavení hesla povinné; S09 bez pole „jednorázové heslo“. |
| US-56 | E-mail obsahuje přihlašovací jméno a jednorázové heslo.           | E-mail obsahuje magic link a odkaz na stránku potvrzení.                        |
| Figma | Obrazovky s jednorázovým heslem.                                  | Upraveno 2026-10-20: S09, S10 (+ S10a, S10b), S15, S17, S18, V04, M06.          |

## 12. Pracovní postup

- **Větve:** `feat/US-23-prihlaska-pres-odkaz`, `fix/…`, `chore/…`, `docs/…`.
- **`main` je chráněná:** jen přes PR, CI (`verify`) musí být zelené, force-push zakázaný, platí i pro adminy.
- **Review:** 0 povinných schválení — autor může PR mergnout sám (GitHub nedovoluje schválit vlastní PR, proto 0). **Review a schválení od člena týmu je doporučené**, zvlášť u změn schématu, auth a doménové logiky.
- **Merge:** jen squash, větev se po merge smaže. Název PR = název commitu: `US-23 Přihláška přes odkaz`.
- **Propojení s boardem:** v těle PR `Refs #23` (ne `Closes`), aby se issue nezavřelo samo. Issue přesune autor do In review; product manager ([Aadikk](https://github.com/Aadikk)) ověří story na stagingu a issue zavře → Done.
- **Definition of Done:**
  1. Všechna akceptační kritéria odškrtnutá, logika má testy, `pnpm check-all` je zelený.
  2. PR je mergnutý do `main` (review doporučené).
  3. Product manager ([Aadikk](https://github.com/Aadikk)) story schválil na stagingu.

## 13. Zjištění ve starteru (vyřešeno ve fázi 0)

- CI na `main` bylo červené kvůli `user-story.md` → opraveno v PR 1.
- `sendResetPassword` se zahazoval kvůli pořadí v konfiguraci BetterAuth → opraveno v PR 1.
- Lokální compose projekt kolidoval s ostatními klony starteru (`backend`) → pojmenovaný `togena` v PR 1.
- Veřejný `/api/auth/sign-up` dovoloval komukoliv založit účet → vypnuto v PR 2.
- Seed na stagingu neběžel (ts-node v image není) → běží zkompilovaný seed při startu, PR 3.
- CI nemělo Postgres → service container a integrační testy, PR 3.

## 14. Otevřené body

| #   | Bod                                                                                                                                                                         | Kdo            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | ~~Env proměnné stagingu: nemáme přístup do Coolify.~~ Uzavřeno 2026-10-21: klíč se zapéká do image přes GitHub secret `RESEND_API_KEY` (`deploy.yml`, `Dockerfile.deploy`). | tech lead      |
| 2   | ~~Založit Brevo účet a ověřit odesílací adresu.~~ Uzavřeno 2026-10-21: místo Brevo se používá Resend.                                                                       | tech lead      |
| 3   | Připojit Figma konektor a převzít tokeny do `global.css`.                                                                                                                   | tech lead      |
