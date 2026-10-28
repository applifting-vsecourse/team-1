# Archiv: sprint 1 (ve skutečnosti sprint 2)

Obsah dokončeného sprintu, přesunutý z [PROJEKT.md](../PROJEKT.md) beze změny textu. Číslování: poslední dokončený sprint se vedl jako „sprint 1“, byl to ale sprint 2 (viz rozhodnutí 27.10.2026). Aktuální stav a platná rozhodnutí jsou v PROJEKT.md; pravidla z akceptačních kritérií, která platí dál, jsou v jeho sekci 5.

> Popsané proudy A–D a rozdělení práce se v praxi nedodržovaly: tým se domlouval ad hoc a nevlastnil si moduly. Berte to jako plán, ne jako popis skutečnosti.

## Rozsah sprintu 1 (původně sekce 5)

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

## Plán práce ve sprintu 1 (původně sekce 6)

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

- **B → C:** po uložení všech přihlášek jednoho odeslání formuláře `ApplicationsService` zavolá `ParticipantAccountsService.ensureAccount(email)` a **jednou** `ApplicationConfirmationMailer.sendSubmissionConfirmation(...)` (US-56): jeden souhrnný e-mail za celé odeslání, i s více účastníky. E-mail o změně přihlášky (`sendApplicationChange`) volají až US-28, 32, 33, 34 a 84.
- **B ↔ D:** stav přihlášky v termínu ([stavový diagram přihlášky v termínu](../procesy/zpracovani-prihlasky/README.md)) se mění a počítá jen v doménových funkcích z fáze 0 (`modules/applications/domain`). Nikdo ho nepočítá znovu po svém.

## Rozdíly vůči boardu: tabulka (původně sekce 11)

PO změnu potvrdil 2026-10-19, issues jsou upravené 2026-10-21. Tabulka zůstává pro dohledání původního zadání.

| Story | Board říká                                                        | Platí                                                                           |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| US-01 | E-mail obsahuje přihlašovací jméno a jednorázové heslo.           | E-mail obsahuje magic link (7 dní, jednorázový).                                |
| US-04 | Účastník zadá e-mail + jednorázové heslo a nastaví vlastní heslo. | Po vstupu odkazem je nastavení hesla povinné; S09 bez pole „jednorázové heslo“. |
| US-56 | E-mail obsahuje přihlašovací jméno a jednorázové heslo.           | E-mail obsahuje magic link a odkaz na stránku potvrzení.                        |
| Figma | Obrazovky s jednorázovým heslem.                                  | Upraveno 2026-10-20: S09, S10 (+ S10a, S10b), S15, S17, S18, V04, M06.          |

## Zjištění ve starteru (původně sekce 13)

- CI na `main` bylo červené kvůli `user-story.md` → opraveno v PR 1.
- `sendResetPassword` se zahazoval kvůli pořadí v konfiguraci BetterAuth → opraveno v PR 1.
- Lokální compose projekt kolidoval s ostatními klony starteru (`backend`) → pojmenovaný `togena` v PR 1.
- Veřejný `/api/auth/sign-up` dovoloval komukoliv založit účet → vypnuto v PR 2.
- Seed na stagingu neběžel (ts-node v image není) → běží zkompilovaný seed při startu, PR 3.
- CI nemělo Postgres → service container a integrační testy, PR 3.

## Uzavřené otevřené body (původně sekce 14)

| #   | Bod                                                                                                                                                                         | Kdo       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | ~~Env proměnné stagingu: nemáme přístup do Coolify.~~ Uzavřeno 2026-10-21: klíč se zapéká do image přes GitHub secret `RESEND_API_KEY` (`deploy.yml`, `Dockerfile.deploy`). | tech lead |
| 2   | ~~Založit Brevo účet a ověřit odesílací adresu.~~ Uzavřeno 2026-10-21: místo Brevo se používá Resend.                                                                       | tech lead |
