# Status s PO (21. 10. 2026)

Demo z aktuálního sprintu pro Tomáše: flow (landing, přihláška, magic link) schválen, design chce pestřejší. Prezentace v pondělí, Adam Hanuš ji odprezentuje sám.

## Úvod a stav týmu

- Tomáš byl zpočátku na cestě, ukázka se proto odložila, dokud se nepřipojil naživo.
- Ticket US12 byl omylem přiřazený na Jakub Kafka, odassignován; Jakub Kafka se k práci dostane až zítra.
- Cíl: dotáhnout development a flow sprintu 1 do pondělí, úkoly jsou na boardu s labelem sprint 1.
- Setup prostředí je popsaný v dokumentech v repu, jde o 3 až 4 příkazy v command line.

## Ukázka flow

- Landing page rozděluje větve na organizátora (účet od provozovatele) a účastníka.
- Přihláška přes odkaz: jméno, příjmení, datum narození, pohlaví, více termínů s cenami, kontaktní email.
  - Veřejná stránka akce není v tomto sprintu
- Magic link funguje na stagingu přes Resend, zatím jen pro jeden registrovaný email (bez vlastní domény).
- Přehled účastníka a detail přihlášky jsou zatím šablona, „k úhradě“ se zobrazuje i u zaplaceného.

## Zpětná vazba od Tomáše

- Formulář přihlášky jako minimální základ dává smysl, další údaje až na platformě.
- Design je příliš jednolitý (modrá na modré), alternativní schéma z Figmy je pestřejší a hravější, to chtěl.
  - Chce to větší kontrast
  - Současný design - "unavující", "smutný"
- [x] Opravit "k úhradě" v detailu Moje přihláška
- [x] Zamyslet se nad textací login formu - aby účastník poznal, že má zadat mail z přihlášky ([#187](https://github.com/applifting-vsecourse/team-1/issues/187))
- [x] Uvažovat do prezentace, že lidi neznají appku a uvidí jí napoprvé.
- Je potřeba vyřešit zakládání organizátorských účtů (více organizátorů, pozvánky), cenový model se fakturuje zpětně.
- Doplnit rok k termínům ve výpisu a u magic linku jasně ukázat, že jde o návrat k existující přihlášce.

## Rady k pondělnímu demu

- Mít systém naplněný realisticky vypadajícími daty, žádné prázdné tabulky.
- Dobře naplánovat výklad, ukázat hodně věcí v krátkém čase lidem, kteří systém vidí poprvé.
- Celkově spokojenost, čekají ještě velké sekce: přehled přihlášek, ubytování, vyhodnocování.

## Další kroky

- (Jan Kudrlička) Domluvit s Honzou časový blok prezentace v pondělí kvůli konzultaci
- (Adam Hanuš) Odprezentovat pondělní demo samostatně
- (Adam Hanuš) Promyslet v backlogu zakládání a zvaní organizátorských účtů

## Přijatá rozhodnutí

- Pestřejší barevné schéma z Figmy slouží jako vstup pro úpravu designu
- Nejdřív se dodávají featury, designové detaily se ladí až na konci
