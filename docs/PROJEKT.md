# Togena — projektový dokument

Živý dokument týmu 1 (4IT580). Shrnuje, co stavíme, co je rozhodnuté a podle čeho pokračujeme.

- **Board** je zdroj pravdy pro **rozsah** (co se dělá a v jakém sprintu).
- **Tento soubor** je zdroj pravdy pro **rozhodnutí a pravidla** (jak se to dělá).
- Když se tyto dva zdroje rozcházejí, platí rozhodnutí zapsané tady, dokud ho tým nebo PO nezmění. Rozdíly vůči boardu jsou v sekci 10.

Když se něco rozhodne (v týmu, s PO, s klientem), zapíše se do [registru rozhodnutí](rozhodnuti/README.md) (sekce 9) s datem, zdrojem a rolí, která rozhodla.

---

## 1. O čem projekt je

**Togena** je platforma pro organizátory vícetermínových akcí (letní kempy, soustředění, LARP tábory, firemní výjezdy). Nahrazuje Google tabulky, ruční počítání kapacit a párování plateb.

Problém klienta: přihlášky se otevírají v jeden okamžik (7. 2. 2027 ve 20:00), do druhého dne je plno a organizátor ručně počítá, kdo se vejde do dámských a pánských pokojů, kdo je náhradník a kdo kolik dluží.

Jádro MVP:

1. Organizátor založí akci s více termíny, cenou za termín a pokoji (dámský / pánský, kapacita).
2. Rozešle neuhodnutelný odkaz; zájemce vyplní krátkou přihlášku na mobilu **bez registrace** a vybere termíny.
3. Každou přihlášku v termínu vyhodnotí zvlášť organizátor ručně, nebo systém automaticky podle pohlaví a volných lůžek (volí se v nastavení akce). Oba režimy mají svůj procesní a stavový diagram, viz [přehled](procesy/zpracovani-prihlasky/README.md).
4. Přihlašovatel hned vidí stav každé své přihlášky v termínu (viz [stavový diagram přihlášky v termínu](procesy/zpracovani-prihlasky/README.md); pořadí náhradníků nevidí) a platební údaje (účet, VS); e-mailem dostane odkaz do svého účtu.
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

- Všechny položky jsou issues v tomto repu, story ve formátu `US-xx Název` podle `.github/ISSUE_TEMPLATE/user-story.md`.
- **Status:** Backlog → Ready (definovaná akceptační kritéria) → (Design) → In progress → Code review (otevřený PR) → In Test (tester před mergem) → In Business Review (po merge, PM na stagingu) → Done. Merguje se až po testu od testera; postup je v [CONTRIBUTING.md](../CONTRIBUTING.md). Jestli se story může začít vyvíjet, určuje štítek `design: …`, ne sloupec. Pole Sprint (iterace) se vyplňuje, Size (XS–XL) a Estimate zatím ne.
- **Štítky:**
  - `epic: …` — 11 epiců (účty, nastavení akce, přihlašování na akce, platby, ubytování, přehledy, komunikace, ekonomika, logistika, platforma, technický základ)
  - `priority: MVP` / `priority: nice to have`
  - `sprint 1` — osekané MVP pro první sprint
  - designový tok: `design: needed` → `design: done`, bez UI `design: not needed`; vyvíjet se může story s `design: done` nebo `design: not needed` bez otevřené otázky na PO
- Uzavřené (vypuštěné podle finálního feature breakdownu): US-17 zálohy, US-48 doúčtování, US-50 platba kartou, US-63 nahrání dokumentu, US-67 oddíly.
- Každá story má sekci **Mimo rozsah** — co tam je, se v dané story nedělá (ani agentem).

## 5. Klíčová pravidla z akceptačních kritérií

Původní rozsah sprintu 1 (tabulka stories) je v [archivu](archiv/SPRINT-1.md). Čísla níže platí dál a musí sedět v testech.

- Kapacita termínu pro ženy = součet kapacit dámských pokojů, pro muže = pánských. 10 + 10 pokojů po 5 místech pojme 50 + 50, **ne** 52 + 48.
- Pokoj (návaznost na US-14): kapacita od 1 bez produktového horního limitu. Pokoje platily do 28.10.2026 pro všechny termíny akce, což je **překonáno** následujícím bodem. V režimu `GENDERED` má pohlaví dámský / pánský; v režimu `SHARED` může být bez pohlaví. US-26 zatím řeší pouze režim `GENDERED`.
- Od 28.10.2026 se ubytování, pokoje, jejich kapacity a dostupnost řeší po termínech (rozhodnutí [D-052](rozhodnuti/README.md#d-052)). Každý termín musí mít ubytování: odkaz na přihlášku funguje, až má každý termín cenu i aspoň jeden pokoj. Režim pokojů (dělený podle pohlaví, nebo společný) se může lišit po termínech ([D-062](rozhodnuti/README.md#d-062)); v datovém modelu je režim pokojů na termínu (`Term.roomMode`) a pokoj patří právě jednomu termínu (`Room.termId`), viz sekce 7 ([US-99](https://github.com/applifting-vsecourse/team-1/issues/192)); pokoje mezi termíny kopíruje [US-100](https://github.com/applifting-vsecourse/team-1/issues/193). Starší model „pokoj platí pro všechny termíny akce“ ještě popisují US-14, US-26 (mají poznámku „platí do 28.10.2026“) a odstavec o US-26 v sekci 10 („Rozdíly vůči boardu“).
- Telefon účastníka je ve formuláři povinný; telefon zákonného zástupce u nezletilých se zatím neřeší ([D-079](rozhodnuti/README.md#d-079)).
- Přihláška se uloží vždy, i když je plno. Termíny se vyhodnocují zvlášť v pořadí přijetí na serveru. Dvě souběžné přihlášky nikdy nepřekročí kapacitu.
- Variabilní symbol je dvouúrovňový ([D-085](rozhodnuti/README.md#d-085)): `Application.number × 1000 + Term.number`. `…000` je souhrn přihlášky (zaplatí aktuální dluh), `…nnn` je platba za jeden termín. VS se neukládá, počítá se a čte celočíselně (`vs / 1000`, `vs % 1000`). Souhrnný VS platí vždy, částka se bere z aktuálního dluhu v okamžiku zápisu. Hodnoty od 9 000 000 000 jsou vyhrazeny pro souhrn odeslání formuláře, proto musí být `Application.number` menší než 9 000 000 (hlídá `variableSymbol()`, v databázi omezení není). Platby různých přihlášek se nesčítají.
- Odkaz na přihlášku funguje, až má akce aspoň jeden termín s cenou a aspoň jeden pokoj (do 28.10.2026; od té doby musí mít ubytování **každý nezrušený termín**; zrušený termín se do podmínky nepočítá, [D-152](rozhodnuti/README.md#d-152)).
- Otevření přihlášek ([D-067](rozhodnuti/README.md#d-067)): moment, kdy akce splní všechny požadavky (termín s cenou, ubytování u každého termínu). Tehdy se vygeneruje odkaz a přihlašování se spustí samo. Výhled, zatím nezavedený:
  - plánované nebo ruční spuštění přihlášek pro akci; čas se zadává v zóně Europe/Prague a organizátor ho může zrušit, dokud spuštění nenastalo ([D-081](rozhodnuti/README.md#d-081));
  - ruční pozastavení přihlášek pro celou akci (např. při výpadku ubytování); účastník důvod nevidí a odeslání přihlášky skončí chybou, že bylo přihlašování pozastaveno ([D-082](rozhodnuti/README.md#d-082)).
- Režim vyhodnocování jde měnit, dokud je počet přijatých přihlášek 0; po první přijaté přihlášce je zamčený, počítá se i zrušená přihláška ([D-083](rozhodnuti/README.md#d-083)).
- Veřejná stránka akce a katalog akcí ([US-122](https://github.com/applifting-vsecourse/team-1/issues/215), [US-123](https://github.com/applifting-vsecourse/team-1/issues/216)):
  - popis, místo a kontakt (e-mail) jsou povinné jen v okamžiku, kdy organizátor akci zveřejňuje v katalogu; bez zveřejnění je lze nechat prázdné ([D-092](rozhodnuti/README.md#d-092));
  - termíny a ceny jsou na veřejné stránce akce vždy vidět, organizátor je nemůže skrýt ([D-093](rozhodnuti/README.md#d-093), PO odsouhlasil 4. 11., [D-116](rozhodnuti/README.md#d-116));
  - obsazenost a kapacita se veřejně nezveřejňují, ani v katalogu akcí (žádný pruh obsazenosti ani text „80 / 120 potvrzených“); rámce ve Figmě, které je kreslí, se v tomto bodě neimplementují ([D-094](rozhodnuti/README.md#d-094));
  - stránka akce má stálou adresu `/events/<publicToken>` bez přihlášení, i když akce není v katalogu; akce bez funkčního odkazu a neexistující token vrací 404 bez obsahu ([D-116](rozhodnuti/README.md#d-116));
  - fotografie veřejné stránky akce smí být JPG/JPEG nebo PNG, WebP ne ([D-096](rozhodnuti/README.md#d-096)); nejvýš 2 MB, jedna na akci, ukládá se do databáze ([D-116](rozhodnuti/README.md#d-116)).
- Lhůta na zaplacení je nastavení akce, výchozí je 10 dní od potvrzení ([D-099](rozhodnuti/README.md#d-099)). Když se místo uvolní v okně „začátek termínu minus lhůta“ (např. týden před akcí při lhůtě 10 dní), potvrzená přihláška se rovnou označí jako po splatnosti, aby se urgovala platba. Zatím je v kódu jen výchozí hodnota (`Event.paymentPeriodDays`); pole „Lhůta na zaplacení (dny)“ v Nastavení akce přidá samostatná story, výzvu k zaplacení řeší [US-46](https://github.com/applifting-vsecourse/team-1/issues/46).
- Formulář přihlášky funguje na 360 px bez vodorovného posunu. Tlačítko Odeslat je po stisku neaktivní.
- Cizí záznam přes URL i API vrací **403** a nic z obsahu.
- Vlastní heslo přihlašovatele má aspoň 8 znaků.

## 6. Slovník (doména → kód)

Kód, DB, API i URL anglicky; texty v UI a e-mailech lokalizované (EN / CZ); dokumentace česky.

Slovník pojmů business domény včetně mapování na kód (sloupec „V kódu“), kolizí pojmů a rozpory mezi zdroji je v [SLOVNIK.md](SLOVNIK.md). Nové pojmy se přidávají tam.

## 7. Datový model (US-71)

```
User (BetterAuth)     accountType: ORGANIZER | PARTICIPANT | ADMIN, mustSetPassword (obojí v session), locale (en | cs, výchozí en, D-069)
Organization          name, bankAccount, contactEmail?, contactPhone?
OrganizationMember    userId, organizationId                       (M:N, organizátor ↔ organizace)
Event                 organizationId, name, description?, location?, contactEmail?, contactPhone?, publicToken (unikátní, neuhodnutelný),
                      evaluationMode (AUTOMATIC | MANUAL, výchozí AUTOMATIC, D-083), paymentPeriodDays (lhůta na zaplacení, výchozí 10, D-099), cancellationStartsOn?, cancellationTerms?, publishedInCatalog (výchozí false)
Term                  organizationId, eventId, number (1–999 v akci, neměnné, D-086), name? (D-053), startsOn, endsOn, priceCzk, roomMode (GENDERED | SHARED, výchozí GENDERED, D-062), cancelledAt?, cancelReason?
Room                  organizationId, termId (pokoj patří termínu, D-052), name, capacity (od 1 bez horního limitu), extraBeds (přistýlky, výchozí 0, US-80), gender?
Application           organizationId, eventId, userId (účet přihlašovatele), number (základ VS, sekvence),
                      accessToken (stránka potvrzení), firstName, lastName, birthDate, gender, email,
                      phone (ve formuláři povinný, D-079; v DB nullable, starší přihlášky ho nemají), locale (en | cs), accommodationRequest?, allergies?, specialRequest?,
                      consentAt, submittedAt
ApplicationTerm       applicationId, termId, status (TO_EVALUATE | WAITLISTED | CONFIRMED | CANCELLED, viz stavový diagram), priceCzk (zmrazená cena), evaluatedAt, paymentPeriodStartedAt?, paymentReminderSentAt?, transportId?
Payment               organizationId, applicationTermId (přihláška v termínu), receiptId (příjem, D-089), amountCzk (záporná = vratka), source (MANUAL | SIMULATION), isSummary?, correctsReceiptId?, recordedById, createdAt, cancelledAt?
ApplicationTermStatusChange  applicationTermId, fromStatus, toStatus, changedById? (null = systém); systémový záznam každé změny stavu (US-28)
ApplicationTermSkip          statusChangeId, skippedApplicationTermId; přeskočení náhradníci při obsazení z pořadníku (US-105)
ChangeRequest         eventId, applicationId, applicantId, kind (TERMS | HEALTH), currentTermIds, requestedTermIds, healthNote?, status (PENDING | APPROVED | REJECTED), rejectionReason?, reviewedById?  (žádost o změnu ke schválení, US-114)
ApplicationEdit       applicationId, changedById?, authorName, changedFields, before, after   (historie úprav údajů přihlašovatelem, US-34)
ApplicationHealth     applicationId (unikátní), note, consentAt   (zdravotní omezení, samostatná tabulka, US-68)
MealOption            eventId, name, position   (nabízená stravovací omezení akce, US-64)
Transport             termId, kind (SCHEDULED | OWN), name, departurePlace?, departureAt?, instructions?   (doprava termínu, US-65)
ProgramBlock          termId, date, startTime, endTime ("HH:mm"), name, place?, description?   (program termínu, US-66)
EventPhoto            eventId (unikátní), fileName, contentType, data   (fotka veřejné stránky, v DB, US-122)
Notification          userId, type (STATUS_CHANGED | PAYMENT | REQUEST), kind, applicationId?, params, readAt?   (upozornění v aplikaci, US-118)
LastOpenedEvent       userId, eventId, openedAt   (kam organizátor po přihlášení přistane, US-51)
```

- Každá tabulka s daty organizace má **přímý** `organizationId` — izolace (US-10) je pak jeden filtr.
- Peníze jako celé číslo v Kč (`Int`).
- `Application.number` je globální autoincrement, základ variabilního symbolu (VS = `number × 1000 + Term.number`, viz sekce 5). Musí být menší než 9 000 000.
- `Term.number` je pořadové číslo termínu v akci (1 až 999), přidělené při vzniku termínu jako nejvyšší + 1 ([D-086](rozhodnuti/README.md#d-086)). Nikdy se nemění ani nepoužije znovu, ani po zrušení termínu: zrušený termín číslo drží, limit 999 platí včetně zrušených termínů a 1000. termín se odmítne chybou `TERM_LIMIT_REACHED`. Je druhou úrovní variabilního symbolu.
- Cena se při vyhodnocení zkopíruje do `ApplicationTerm.priceCzk`; pozdější změna ceny termínu se týká jen nových přihlášek.
- `Application.userId` je nullable: přihláška se uloží, i když účet přihlašovatele ještě nevznikl.
- Veřejná registrace (`/api/auth/sign-up`) zakládá vždy organizátora (US-69: registrace, ověření e-mailu, založení organizace, [D-126](rozhodnuti/README.md#d-126)). Účty přihlašovatelů vznikají jen na serveru, odesláním přihlášky. Magic link nezaloží nový účet.
- Platby jsou řádky (`Payment`), ne příznak na přihlášce — připraveno na import z banky (US-42). Platba patří přihlášce v termínu. Příjem (peníze, které dorazily najednou) tvoří jeden nebo více řádků se stejným `receiptId` ([D-089](rozhodnuti/README.md#d-089)): platba na souhrnný VS vytvoří řádek za každou potvrzenou přihlášku v termínu, kterou splácí, a zrušení jednoho řádku zruší celou skupinu. Vratka je jeden záporný řádek na jedné přihlášce v termínu, omezený jejím přeplatkem; zadává se přes `termId` (bez něj chyba). Opravená platba je nový příjem odkazující na původní (`correctsReceiptId`, US-112, [D-119](rozhodnuti/README.md#d-119)).

## 8. Architektura

### Routy (URL anglicky, stejné pro oba jazyky)

```
Veřejné
  /                                    landing (US-96)
  /apply/$token                        formulář přihlášky (US-23)
  /apply/confirmation/$accessToken     stav a platební údaje (US-25)
  /catalog                             katalog akcí (US-123)
  /events/$publicToken                 veřejná stránka akce (US-22)
  /email-change                        konec ověřovacího odkazu změny e-mailu (US-125)

Přihlášení
  /organizer/login                     e-mail + heslo (S01)
  /organizer/register                  registrace organizátora (US-69)
  /organizer/verify-email              ověření e-mailu
  /organizer/onboarding                založení organizace po registraci
  /participant/login                   e-mail + heslo, nebo „pošlete mi odkaz“ (S10)
  /participant/set-password            povinně po prvním vstupu odkazem (S09)
  /participant/magic-link              vstup přihlašovatele odkazem z e-mailu

Organizátor (jen ORGANIZER, jinak 403)
  /organizer                           přesměrování na přehled naposledy otevřené akce, bez ní na /organizer/events (US-51, D-050, D-114)
  /organizer/events                    akce seskupené podle organizace (O02)
  /organizer/events/new
  /organizer/events/$eventId           přehled a obsazenost (US-29)
  /organizer/events/$eventId/terms
  /organizer/events/$eventId/rooms
  /organizer/events/$eventId/capacity  kapacity všech termínů; `?termId=` detail termínu (N3 / N4)
  /organizer/events/$eventId/applications
  /organizer/events/$eventId/applications/new          ruční přidání přihlášky (US-83)
  /organizer/events/$eventId/applications/$applicationId        detail přihlášky
  /organizer/events/$eventId/applications/$applicationId/health  zdravotní omezení účastníka (US-68)
  /organizer/events/$eventId/settings              nastavení akce
  /organizer/events/$eventId/payments              přehled plateb a dluhů (US-45)
  /organizer/events/$eventId/payments/cancellation storno podmínky (US-47)
  /organizer/events/$eventId/meals                 souhrn pro kuchyni (US-64)
  /organizer/events/$eventId/meals/options         varianty stravování
  /organizer/events/$eventId/program               program akce (US-66)
  /organizer/events/$eventId/transport             doprava (US-65)
  /organizer/events/$eventId/transport/$transportId/participants  účastníci dopravy
  /organizer/account

Přihlašovatel (jen PARTICIPANT)
  /participant                         moje přihlášky (US-54)
  /participant/applications/$applicationId  jedna přihláška: stav, platba (US-54)
  /participant/applications/$applicationId/edit       úprava údajů (US-34)
  /participant/applications/$applicationId/meals      stravování (US-64)
  /participant/applications/$applicationId/health     zdravotní omezení (US-68)
  /participant/applications/$applicationId/program    program (US-66)
  /participant/applications/$applicationId/transport  doprava (US-65)
  /participant/account
```

Organizace v URL není. Přístup se ověřuje přes členství v organizaci, které akce patří.

### API (EN, prefix `/api`)

```
/auth/*                                    BetterAuth (černá skříňka)
/me                                        GET, PATCH přihlášený uživatel včetně accountType a `locale`; POST email-change změna e-mailu (US-124, US-125)
/public/events/:publicToken                akce + termíny s cenami pro formulář
/public/events/:publicToken/applications   POST odeslání přihlášky
/public/applications/:accessToken          stránka potvrzení
/organizer/events[/:eventId]               akce; PUT :eventId/public-page, PUT/GET/DELETE :eventId/photo, PATCH :eventId/evaluation-mode (D-083), PUT :eventId/cancellation-start a cancellation-terms (US-113, US-47), DELETE :eventId
/organizer/events/:eventId/terms[/:termId]   termíny; POST :termId/cancel zrušení termínu (US-13, bez DELETE)
/organizer/events/:eventId/terms/:termId/rooms[/:id]    pokoje termínu (D-052); POST rooms/copy kopie z jiného termínu (US-100), PATCH rooms/:id/extra-beds přistýlky (US-80)
/organizer/events/:eventId/terms/:termId/room-mode      PATCH režim pokojů termínu (D-062)
/organizer/events/:eventId/applications    seznam s filtry ?termId&status&paid
/organizer/events/:eventId/occupancy       obsazenost
/organizer/events/:eventId/capacity        aktuální kapacita a volná lůžka podle pohlaví pro každý termín
/organizer/events/:eventId/capacity/details  přehled včetně pokojů a dat termínů
/organizer/applications/:id/payments       GET seznam, POST zápis příjmu (volitelný `termId`: bez něj souhrn, s ním platba za jeden termín); PATCH/DELETE :receiptId oprava a zrušení příjmu, POST :receiptId/preview náhled opravy (US-111, US-112)
/organizer/applications/:id/payments/refunds   POST vratka, `termId` povinné (D-089)
/participant/applications[/:id]            moje přihlášky a jedna přihláška (US-54)
/participant/password                      POST první heslo přihlašovatele (US-04)
/notifications                             GET, GET unread-count, POST read-all, POST :id/read (US-118)
/public/catalog                            GET katalog akcí (US-123)
/public/events/:publicToken/page|photo     GET veřejná stránka a fotka akce (US-22, US-122)
/organizer/organizations                   POST založení organizace; GET :organizationId; PUT :organizationId/profile (US-69)
/organizer/profile                         GET profil organizátora
/organizer/last-opened-event, PUT /organizer/events/:eventId/last-opened   poslední otevřená akce (US-51)
/organizer/events/:eventId/attention       GET co vyžaduje pozornost (US-51)
/organizer/events/:eventId/payments        GET přehled plateb a dluhu (US-45)
/organizer/events/:eventId/applications    POST ruční přidání přihlášky (US-83)
/organizer/events/:eventId/terms/:termId/substitutes   GET pořadník, GET history, POST :applicationId/confirm (US-104, US-105)
/organizer/events/:eventId/terms/:termId/bulk-confirmation (POST, POST preview) a bulk-decision (POST)   hromadná rozhodnutí (US-107, US-108)
/organizer/events/:eventId/change-requests GET, GET :requestId, PATCH :requestId/approve|reject (US-114)
/organizer/applications/:applicationId/terms   GET stavy, PATCH :termId/status, GET change-options|change-preview, PUT změna termínů, GET withdraw-preview, POST withdraw (US-28, US-32, US-33)
/organizer/applications/:applicationId/history GET historie přihlášky; /health GET zdravotní omezení
/organizer/events/:eventId/meals           GET options, PUT options, GET summary (US-64)
/organizer/events/:eventId/transport       GET, POST, PUT/DELETE :id, GET :id/participants (US-65)
/organizer/events/:eventId/program         GET, POST terms/:termId/blocks, PUT/DELETE blocks/:id (US-66)
/participant/applications/:id              GET, GET :id/edit, PUT :id/edit úprava údajů (US-34)
/participant/applications/:applicationId/  change-requests (GET, POST), health-change-requests (POST), change-options (GET), PUT terms (US-84), meals, health, transport, program (GET/PUT), payments/simulation (POST, jen staging a demo, US-115)
/participant/change-request-notifications  GET, PATCH :requestId/read
```

### Lokalizace (EN / CZ)

- **Frontend:** i18next + react-i18next. Výchozí jazyk je angličtina; při první návštěvě rozhoduje jazyk prohlížeče (český prohlížeč → čeština). Přepínač jazyka je na veřejných stránkách a při registraci v hlavičce; v administraci a v oblasti přihlašovatele je volba jazyka (ukládá se do účtu) a vzhledu (jen v zařízení) v Nastavení účtu → Předvolby ([D-147](rozhodnuti/README.md#d-147)). Volba se pamatuje v `localStorage` (`togena.language`). URL jsou pro oba jazyky stejné. Přihlášený uživatel si jazyk ukládá i do účtu (`User.locale`, `PATCH /me`) a ten je jazykem jeho e-mailů ([D-069](rozhodnuti/README.md#d-069)). Jazyk aplikace po přihlášení na jiném zařízení se z účtu zatím nepřebírá, rozhoduje volba uložená v prohlížeči (řeší US-128).
- **Překlady:** `apps/frontend/src/i18n/locales/{en,cs}/<namespace>.json`, jeden namespace na feature složku (`events`, `applicationForm`, `participant`, `eventOverview`, `auth`, `landing`) + `common` a `errors`. Každý proud edituje svoje soubory. Klíče jsou typově kontrolované proti angličtině a test hlídá, že obě jazykové verze mají stejné klíče.
- **Formáty:** peníze a data přes `formatCzk` / `formatDate` v `lib/`, podle aktuálního jazyka (`1 500 Kč` / `CZK 1,500`).
- **Chyby z API:** backend vrací `{ statusCode, code, message }` (volitelně i `params`); frontend přeloží `code` přes `errors.json`; volitelné `params` (klíč → hodnota) se dosadí do zástupných značek `{{…}}` v překladu. Nový kód = `shared/errors/error-code.ts` + oba `errors.json`.
- **Jazyk požadavku:** frontend posílá `Accept-Language`, backend ho čte dekorátorem `@RequestLocale()`.
- **E-maily:** potvrzení přihlášky (e-mail č. 1) jde v jazyce přihlášky (`Application.locale`, uloží se při odeslání z `@RequestLocale()`), e-maily o změně přihlášky v preferovaném jazyce uživatele, a když ho nenastavil, v jazyce jeho první přihlášky ([D-078](rozhodnuti/README.md#d-078); preferovaný jazyk uživatele je `User.locale`, nastavuje se v Nastavení účtu, viz [D-069](rozhodnuti/README.md#d-069). Do US-128 schéma „nenastaveno“ od výchozího `en` nerozliší, proto `en` znamená „nenastaveno“ a platí jazyk první přihlášky, [D-136](rozhodnuti/README.md#d-136)), reset hesla a ověření e-mailu v jazyce účtu (`User.locale`). Samostatný e-mail s magic linkem jde v jazyce UI v okamžiku žádosti (frontend ho pošle jako `metadata.locale`), `User.locale` se pro něj nepoužije; když jazyk chybí, platí `en`. Šablony mají texty obou jazyků vedle sebe (`core/email/templates`).

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
- **Souběh (US-27, US-14):** odeslání přihlášky běží v jedné transakci; nejdřív zamkne akci a potom řádky vybraných termínů (`SELECT … FOR UPDATE`, seřazené podle id kvůli deadlockům), pak spočítá volná místa a zapíše stavy. Změny pokojů a režimu zamykají stejnou akci, aby neměnily kapacitu během vyhodnocení. Čas přijetí určuje server.
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

### Vazby mezi moduly

- **Přihlášky → účty a e-maily:** po uložení všech přihlášek jednoho odeslání formuláře `ApplicationsService` zavolá `ParticipantAccountsService.ensureAccount(email)` a **jednou** `ApplicationConfirmationMailer.sendSubmissionConfirmation(...)` (US-56): jeden souhrnný e-mail za celé odeslání, i s více účastníky. E-mail o změně přihlášky (`sendApplicationChange`) volají `TermStatusService` (změny stavu přihlášky v termínu) a `ChangeRequestService` (žádosti o změnu).
- **Přihlášky ↔ přehledy:** stav přihlášky v termínu ([stavový diagram přihlášky v termínu](procesy/zpracovani-prihlasky/README.md)) se mění a počítá jen v doménových funkcích z fáze 0 (`modules/applications/domain`). Nikdo ho nepočítá znovu po svém.

## 9. Rozhodnutí

Rozhodnutí jsou v [registru rozhodnutí](rozhodnuti/README.md): `docs/rozhodnuti/rozhodnuti.yaml` (zdroj pravdy), přehled `README.md` se z něj generuje, schéma je v [SCHEMA.md](rozhodnuti/SCHEMA.md). Každé rozhodnutí má ID, datum, zdroj a roli, která rozhodla; změna dřívějšího rozhodnutí se zapisuje novým záznamem, který na původní odkazuje. Otevřené otázky jsou v [registru otázek](otevrene-otazky/README.md).

## 10. Rozdíly vůči boardu

Upřesnění zadavatele z 23. 10. 2026 pro US-26 je v registru jako [D-054](rozhodnuti/README.md#d-054).

Tabulka rozdílů vůči boardu pro US-01, US-04, US-56 a Figmu (jednorázové heslo → magic link) je v [archivu](archiv/SPRINT-1.md).

## 11. Pracovní postup

- **Větve:** `feat/US-23-prihlaska-pres-odkaz`, `fix/…`, `chore/…`, `docs/…`.
- **`main` je chráněná:** jen přes PR, CI (`verify` a `e2e`) musí být zelené, force-push zakázaný, platí i pro adminy.
- **Review:** PR do `main` potřebuje 1 schválení od člena týmu (GitHub nedovoluje schválit vlastní PR), obejít ho může maintainer nebo admin.
- **Merge:** jen squash, větev se po merge smaže. Název PR = název commitu: `US-23 Přihláška přes odkaz`.
- **Propojení s boardem:** PR k ticketu začíná řádkem `Closes #23`, jinak se s ním v GitHubu nepropojí. Merge issue zavře a workflow boardu „Item closed“ ho přesune do In Business Review; product manager ([Aadikk](https://github.com/Aadikk)) ověří story na stagingu a přesune ji ručně do Done.
- **Definition of Done:**
  1. Všechna akceptační kritéria odškrtnutá, logika má testy, `pnpm check-all` je zelený.
  2. Tester ([PJjiry](https://github.com/PJjiry)) story otestoval před mergem.
  3. PR je schválený a mergnutý do `main`.
  4. Product manager ([Aadikk](https://github.com/Aadikk)) story schválil na stagingu.
- **Sdílené soubory** (`schema.prisma`, `app.module.ts`, `routes.ts`, `components/*`): měň je jen v rozsahu své story a v PR na to upozorni. Práci si nerozdělujeme do proudů ani modulů, domlouváme se ad hoc a do práce si nezasahujeme.

## 12. Otevřené body

| #   | Bod                 | Kdo |
| --- | ------------------- | --- |
| –   | Žádný otevřený bod. | –   |

## 13. Archiv

Co se týkalo jen dokončeného sprintu 1 (ve skutečnosti sprint 2), je přesunuto do [archiv/SPRINT-1.md](archiv/SPRINT-1.md). Text se nezměnil, jen je mimo hlavní dokument, aby zůstal aktuální.

- **Rozsah sprintu 1** (tabulka 22 stories s proudy): sprint je hotový a rozsah další práce je na boardu. Čísla z akceptačních kritérií, která platí dál, zůstala v sekci 5.
- **Plán práce ve sprintu 1** (fáze 0 a 1, proudy A–D, „Kdo sahá kam“, styčné body): proudy a vlastnictví modulů se v praxi nedodržovaly, tým se domlouvá ad hoc. Technická pravidla ze styčných bodů jsou v sekci 8 (Vazby mezi moduly), pravidlo o sdílených souborech v sekci 11.
- **Tabulka rozdílů vůči boardu** (US-01, US-04, US-56, Figma: jednorázové heslo → magic link): issues jsou od 2026-10-21 upravené, tabulka slouží jen k dohledání původního zadání. Odstavec o US-26 (upřesnění zadavatele z 23.10.2026) zůstal v sekci 10 („Rozdíly vůči boardu“) a není v archivu.
- **Zjištění ve starteru** (CI, BetterAuth, compose, seed): vyřešeno ve fázi 0.
- **Uzavřené otevřené body** (Coolify, Brevo → Resend): uzavřeno 2026-10-21.
