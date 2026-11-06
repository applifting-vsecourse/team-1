# Registr rozhodnutí

> Generováno z [`rozhodnuti.yaml`](rozhodnuti.yaml) (`python generate.py`). Needituj, měň YAML.

**102 platných**, 0 návrhů, 3 nahrazených nebo zrušených.

## Návrhy čekající na PM

_Nic._

## Nezapsaný dopad na dokumentaci

| ID | Rozhodnutí | Soubor | Co zapsat |
| --- | --- | --- | --- |
| [D-069](#d-069) | Uživatel si nastaví preferovaný jazyk (aplikace i e-maily) | `docs/PROJEKT.md` | pravidlo jazyka aplikace a e-mailů: preferovaný jazyk uživatele (zapsat při zadání ticketu) |
| [D-085](#d-085) | Dvouúrovňový variabilní symbol | `docs/PROJEKT.md` | řádek „Variabilní symbol = číslo přihlášky“ (sekce 5) přepsat na dvouúrovňový VS; uvést vyhrazený rozsah VS od 9 000 000 000 a omezení Application.number < 9 000 000 |
| [D-085](#d-085) | Dvouúrovňový variabilní symbol | `docs/SLOVNIK.md` | Variabilní symbol: dvouúrovňový, patří přihlášce a přihlášce v termínu; class diagram |
| [D-085](#d-085) | Dvouúrovňový variabilní symbol | `docs/procesy/zpracovani-prihlasky/EMAILY.md` | platební údaje u e-mailů č. 2, 5, 7: souhrnný VS a VS každé potvrzené přihlášky v termínu |
| [D-086](#d-086) | `Term.number` je neměnné číslo termínu v akci | `docs/PROJEKT.md` | datový model: Term.number |
| [D-087](#d-087) | Souhrnná platba se rozděluje od nejstaršího termínu | `docs/SLOVNIK.md` | pojmy Souhrn přihlášky a Příjem; pravidlo rozdělení |
| [D-088](#d-088) | Platba na VS bez dluhu je přeplatek přihlášky v termínu | `docs/SLOVNIK.md` | Přeplatek patří přihlášce v termínu |
| [D-089](#d-089) | Příjem = řádky `Payment` po přihlášce v termínu se společným `receiptId` | `docs/PROJEKT.md` | datový model: Payment.applicationTermId, Payment.receiptId; API plateb s volitelným termId |
| [D-092](#d-092) | Popis, místo a kontakt jsou povinné jen pro zveřejnění v katalogu | `docs/PROJEKT.md` | veřejná stránka akce: povinnost polí jen pro zveřejnění v katalogu |
| [D-093](#d-093) | Termíny a ceny jsou na veřejné stránce akce zatím vždy vidět | `docs/PROJEKT.md` | veřejná stránka akce: termíny a ceny vždy viditelné (dočasně) |
| [D-094](#d-094) | Obsazenost a kapacita se veřejně nezveřejňují | `docs/PROJEKT.md` | katalog akcí: obsazenost a kapacita nejsou veřejné |
| [D-096](#d-096) | Fotka veřejné stránky akce: jen JPG/JPEG a PNG | `docs/PROJEKT.md` | veřejná stránka akce: formát fotky JPG/JPEG a PNG |
| [D-099](#d-099) | Lhůta na zaplacení se nastavuje u akce; pozdní potvrzení je rovnou po splatnosti | `docs/PROJEKT.md` | lhůta na zaplacení jako nastavení akce; potvrzení v okně lhůty = po splatnosti |

## Změny dřívějších rozhodnutí

| ID | Rozhodnutí | Datum | Vztah |
| --- | --- | --- | --- |
| [D-027](#d-027) | Landing má jediný vstup „Pro organizátory“ | 2026-10-19 | mění [D-006](#d-006) |
| [D-040](#d-040) | Vyhodnocování přihlášek: ruční nebo automatické | 2026-10-23 | nahrazuje [D-003](#d-003) |
| [D-043](#d-043) | E-mail organizátora v přihlášce: obecná chyba VALIDATION_FAILED | 2026-10-25 | nahrazuje [D-013](#d-013) |
| [D-050](#d-050) | Dashboard organizátora se vrací | 2026-10-28 | mění [D-042](#d-042) |
| [D-071](#d-071) | Práce se nedělí do proudů | 2026-10-31 | mění [D-026](#d-026) |
| [D-072](#d-072) | Landing má dva vstupy „Jsem organizátor“ a „Jsem účastník“ | 2026-10-31 | nahrazuje [D-027](#d-027)mění [D-006](#d-006) |
| [D-074](#d-074) | Přechod Potvrzená → Náhradník má vlastní e-mail jako samostatný stav v EMAILY.md | 2026-10-31 | mění [D-056](#d-056) |
| [D-077](#d-077) | Přesun mezi náhradníky jen u Potvrzené s dluhem, ruční zásahy platí v obou režimech | 2026-10-31 | mění [D-056](#d-056), mění [D-057](#d-057) |
| [D-078](#d-078) | Preferovaný jazyk uživatele přebíjí jazyk přihlášky u e-mailů o změně přihlášky | 2026-10-31 | mění [D-069](#d-069) |
| [D-083](#d-083) | Režim vyhodnocování lze měnit, dokud je počet přijatých přihlášek 0 | 2026-10-31 | mění [D-068](#d-068) |
| [D-085](#d-085) | Dvouúrovňový variabilní symbol | 2026-11-01 | mění [D-016](#d-016), mění [D-034](#d-034) |

## Platná rozhodnutí podle oblasti

### design

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-049](#d-049) | Zdroj designové pravdy je Design systém ve Figmě | 2026-10-27 | `pm` | design |
| [D-038](#d-038) | Organizátor: akce jako karty, sekce akce v sidebaru | 2026-10-21 | `tech-lead` | design |
| [D-029](#d-029) | Redesign v původním Figma souboru a barvách | 2026-10-20 | `tech-lead` | design |
| [D-022](#d-022) | Tokeny z Figmy, pravidla z DESIGN.md | 2026-10-16 | `tech-lead` | design |

### komunikace

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-106](#d-106) | Kontakty v patičce e-mailů podle druhu zprávy | 2026-11-03 | `pm` | produkt |
| [D-104](#d-104) | Změnové e-maily se týkají jen přihlášených a změněných termínů | 2026-11-03 | `pm` | produkt |
| [D-103](#d-103) | Při zamítnutí nebo odhlášení zaplacené účasti e-mail refund neslibuje | 2026-11-03 | `pm` | produkt |
| [D-098](#d-098) | Jména v rámci se neskloňují | 2026-11-02 | `pm` | produkt |
| [D-078](#d-078) | Preferovaný jazyk uživatele přebíjí jazyk přihlášky u e-mailů o změně přihlášky | 2026-10-31 | `pm` | produkt |
| [D-074](#d-074) | Přechod Potvrzená → Náhradník má vlastní e-mail jako samostatný stav v EMAILY.md | 2026-10-31 | `pm` | produkt |
| [D-069](#d-069) | Uživatel si nastaví preferovaný jazyk (aplikace i e-maily) | 2026-10-31 | `pm` | produkt |
| [D-066](#d-066) | Sdružení e-mailů za více termínů až v US-116 | 2026-10-31 | `pm` | produkt |
| [D-055](#d-055) | Jazyk magic link e-mailu je jazyk UI při žádosti | 2026-10-30 | `tech-lead` | produkt |
| [D-034](#d-034) | Souhrnný potvrzovací e-mail | 2026-10-21 | `po` | produkt |

### nastavení akce

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-096](#d-096) | Fotka veřejné stránky akce: jen JPG/JPEG a PNG | 2026-11-02 | `pm` | produkt |
| [D-093](#d-093) | Termíny a ceny jsou na veřejné stránce akce zatím vždy vidět | 2026-11-02 | `pm` | produkt |
| [D-092](#d-092) | Popis, místo a kontakt jsou povinné jen pro zveřejnění v katalogu | 2026-11-02 | `pm` | produkt |
| [D-083](#d-083) | Režim vyhodnocování lze měnit, dokud je počet přijatých přihlášek 0 | 2026-10-31 | `pm` | produkt |
| [D-082](#d-082) | Pozastavení přihlášek platí pro akci, důvod účastník nevidí, nová přihláška skončí chybou | 2026-10-31 | `pm` | produkt |
| [D-081](#d-081) | Plánované spuštění přihlášek platí pro akci, v čase Europe/Prague, lze zrušit do spuštění | 2026-10-31 | `pm` | produkt |
| [D-068](#d-068) | Zamčení režimu vyhodnocování bez přihlášky je v pořádku | 2026-10-31 | `pm` | produkt |
| [D-067](#d-067) | „Otevření přihlášek“ = akce splní všechny požadavky a vznikne link | 2026-10-31 | `pm` | produkt |
| [D-063](#d-063) | Společná fronta náhradníků, když pokoj nemá pohlaví | 2026-10-31 | `pm` | produkt |
| [D-062](#d-062) | Režim pokojů se může lišit po termínech | 2026-10-31 | `pm` | produkt |
| [D-053](#d-053) | Název termínu je volitelný | 2026-10-28 | `pm` | produkt |
| [D-052](#d-052) | Ubytování, pokoje, jejich kapacity a dostupnost se řeší po jednotlivých termínech | 2026-10-28 | `pm` | produkt |
| [D-044](#d-044) | Nálezy z testování (#153) | 2026-10-26 | `tech-lead` | produkt |
| [D-037](#d-037) | Termín může být zdarma (cena 0) | 2026-10-21 | `tech-lead` | produkt |

### platby

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-102](#d-102) | Výzva po splatnosti: jednou, automaticky nebo ručně podle organizátora | 2026-11-03 | `pm` | produkt |
| [D-100](#d-100) | Oprava platby vrací zaplacenou přihlášku k dluhu | 2026-11-03 | `pm` | produkt |
| [D-097](#d-097) | VS termínů na stránce po odeslání se nedoplňuje | 2026-11-02 | `pm` | produkt |
| [D-091](#d-091) | Jedna platba za celé odeslání formuláře je záměr, mimo US-137 | 2026-11-01 | `pm` | produkt |
| [D-090](#d-090) | Stará platební data se smažou, seed se přepíše | 2026-11-01 | `pm` | technicke |
| [D-089](#d-089) | Příjem = řádky `Payment` po přihlášce v termínu se společným `receiptId` | 2026-11-01 | `pm` | technicke |
| [D-088](#d-088) | Platba na VS bez dluhu je přeplatek přihlášky v termínu | 2026-11-01 | `pm` | produkt |
| [D-087](#d-087) | Souhrnná platba se rozděluje od nejstaršího termínu | 2026-11-01 | `pm` | produkt |
| [D-086](#d-086) | `Term.number` je neměnné číslo termínu v akci | 2026-11-01 | `pm` | technicke |
| [D-085](#d-085) | Dvouúrovňový variabilní symbol | 2026-11-01 | `pm` | produkt |
| [D-080](#d-080) | Platby při zrušení termínu vrací organizátor bez lhůty a bez potvrzení | 2026-10-31 | `pm` | produkt |
| [D-051](#d-051) | Platba se váže ke konkrétnímu termínu | 2026-10-28 | `pm` | produkt |
| [D-015](#d-015) | Cena termínu se při vyhodnocení zmrazí do ApplicationTerm.priceCzk | 2026-10-16 | `tech-lead` | produkt |
| [D-002](#d-002) | Platby bez brány a bez banky — ruční zápis | board | `po` | produkt |

### platforma

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-095](#d-095) | Odkaz na katalog z landingu je samostatná story | 2026-11-02 | `pm` | produkt |
| [D-094](#d-094) | Obsazenost a kapacita se veřejně nezveřejňují | 2026-11-02 | `pm` | produkt |
| [D-005](#d-005) | Produkt se jmenuje Togena | 2026-10-16 | `tech-lead` | produkt |

### přehledy

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-050](#d-050) | Dashboard organizátora se vrací | 2026-10-28 | `pm` | produkt |
| [D-042](#d-042) | Dashboard organizátora se ruší | 2026-10-25 | `tech-lead` | produkt |

### přihlašování na akce

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-099](#d-099) | Lhůta na zaplacení se nastavuje u akce; pozdní potvrzení je rovnou po splatnosti | 2026-11-05 | `pm` | produkt |
| [D-079](#d-079) | Telefon účastníka je ve formuláři přihlášky povinný, u nezletilých se neřeší | 2026-10-31 | `pm` | produkt |
| [D-077](#d-077) | Přesun mezi náhradníky jen u Potvrzené s dluhem, ruční zásahy platí v obou režimech | 2026-10-31 | `pm` | produkt |
| [D-076](#d-076) | Při zrušení termínu se zaplacené platby vracejí, archivované přihlášky se nerulí | 2026-10-31 | `pm` | produkt |
| [D-075](#d-075) | V angličtině je datum narození DD/MM/YYYY (en-GB) | 2026-10-31 | `pm` | produkt |
| [D-073](#d-073) | Přihláška přesunutá z Potvrzené mezi náhradníky se řadí podle data přijetí | 2026-10-31 | `pm` | produkt |
| [D-070](#d-070) | Detail přihlášky náhradníka říká „Zatím nic neplaťte“ | 2026-10-31 | `pm` | produkt |
| [D-065](#d-065) | Zrušení termínu zruší všechny přihlášky ve všech stavech | 2026-10-31 | `pm` | produkt |
| [D-064](#d-064) | Náhradník se ruší od půlnoci českého času prvního dne termínu | 2026-10-31 | `pm` | produkt |
| [D-061](#d-061) | Telefon se sbírá novým ticketem, ne v US-30 | 2026-10-31 | `pm` | produkt |
| [D-059](#d-059) | US-28 stačí vědomé potvrzení nad kapacitu, přistýlka přijde s US-80 | 2026-10-31 | `pm` | produkt |
| [D-058](#d-058) | Přechody z K vyhodnocení doplní US-102 | 2026-10-31 | `pm` | produkt |
| [D-057](#d-057) | Organizátor smí zrušit náhradníka kdykoli | 2026-10-31 | `pm` | produkt |
| [D-056](#d-056) | Potvrzená → Náhradník ručně organizátorem | 2026-10-31 | `pm` | produkt |
| [D-045](#d-045) | Duplicitní přihláška (#160, US-23) | 2026-10-26 | `tym` | produkt |
| [D-043](#d-043) | E-mail organizátora v přihlášce: obecná chyba VALIDATION_FAILED | 2026-10-25 | `tech-lead` | produkt |
| [D-040](#d-040) | Vyhodnocování přihlášek: ruční nebo automatické | 2026-10-23 | `tym` | produkt |
| [D-036](#d-036) | Účastník nevidí pořadí náhradníků | 2026-10-21 | `tym` | produkt |
| [D-012](#d-012) | Další přihláška se stejným e-mailem je povolená | 2026-10-16 | `tech-lead` | produkt |
| [D-011](#d-011) | Stránka po odeslání má tajnou URL | 2026-10-16 | `tech-lead` | technicke |
| [D-010](#d-010) | Odkaz na přihlášku = neuhodnutelný token /apply/<token> | 2026-10-16 | `tech-lead` | technicke |
| [D-004](#d-004) | Akce = jeden celek s více termíny, každý termín se vyhodnocuje zvlášť | board | `po` | produkt |

### technický základ

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-033](#d-033) | E-maily na stagingu přes Resend | 2026-10-21 | `tech-lead` | technicke |
| [D-024](#d-024) | Jazyk: kód anglicky, dokumentace česky, UI lokalizované EN / CZ | 2026-10-16 | `tech-lead` | technicke |
| [D-021](#d-021) | Stack zůstává ze starteru | 2026-10-16 | `tech-lead` | technicke |
| [D-019](#d-019) | Testy: unit a integrační proti sestavenému serveru | 2026-10-16 | `tech-lead` | technicke |
| [D-018](#d-018) | Celé schéma pro sprint 1 vzniká ve fázi 0 | 2026-10-16 | `tech-lead` | technicke |
| [D-017](#d-017) | Staging: seed běží při každém startu a je idempotentní | 2026-10-16 | `tech-lead` | technicke |
| [D-016](#d-016) | Peníze jako celé Kč (Int) | 2026-10-16 | `tech-lead` | technicke |

### tým a proces

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-071](#d-071) | Práce se nedělí do proudů | 2026-10-31 | `pm` | proces |
| [D-060](#d-060) | Blok „Stav v termínech“: merge neblokuje, UI/UX dolaďovat zpětně | 2026-10-31 | `pm` | proces |
| [D-048](#d-048) | MVP / nice to have se vede milestonem | 2026-10-27 | `pm` | proces |
| [D-047](#d-047) | Sprint se vede jako pole Sprint v GitHub Projects | 2026-10-27 | `pm` | proces |
| [D-046](#d-046) | Oprava číslování sprintů | 2026-10-27 | `tym` | proces |
| [D-035](#d-035) | Jeden PR na featuru | 2026-10-21 | `tech-lead` | proces |
| [D-032](#d-032) | Byznysový slovník v repozitáři je závazný | 2026-10-20 | `pm` | proces |
| [D-031](#d-031) | Board rozlišuje design, vývoj, test a business review | 2026-10-20 | `pm` | proces |
| [D-030](#d-030) | Vývoj poběží po jednotlivých featurách | 2026-10-20 | `pm` | proces |
| [D-026](#d-026) | Tým a vedení storek | 2026-10-16 | `tech-lead` | proces |
| [D-025](#d-025) | Práce po vertikálních řezech | 2026-10-16 | `tech-lead` | proces |
| [D-023](#d-023) | Licence MIT | 2026-10-16 | `tech-lead` | proces |

### ubytování

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-084](#d-084) | Datový model režimu pokojů po termínech se přepíše na nový systém bez migrace | 2026-10-31 | `pm` | technicke |
| [D-054](#d-054) | US-26: čtecí přehled kapacit jen pro akce s dělením podle pohlaví | 2026-10-23 | `po` | produkt |
| [D-041](#d-041) | US-14: kapacita pokoje bez horního limitu | 2026-10-23 | `po` | produkt |
| [D-039](#d-039) | US-14: oba režimy pokojů jsou v rozsahu | 2026-10-22 | `po` | produkt |
| [D-014](#d-014) | Pokles kapacity pod počet potvrzených je povolený | 2026-10-16 | `tech-lead` | produkt |

### účty

| ID | Rozhodnutí | Datum | Rozhodl | Typ |
| --- | --- | --- | --- | --- |
| [D-105](#d-105) | Obecné ověření e-mailové adresy se nepožaduje | 2026-11-03 | `pm` | produkt |
| [D-072](#d-072) | Landing má dva vstupy „Jsem organizátor“ a „Jsem účastník“ | 2026-10-31 | `pm` | produkt |
| [D-028](#d-028) | Landing má dva vstupy a je jen pro nepřihlášené | 2026-10-19 | `tym` | produkt |
| [D-020](#d-020) | Organizace není v URL | 2026-10-16 | `tech-lead` | produkt |
| [D-009](#d-009) | Nová přihláška se přiřadí k existujícímu účtu | 2026-10-16 | `tech-lead` | produkt |
| [D-008](#d-008) | Účastník dostává magic link místo jednorázového hesla | 2026-10-16 | `tech-lead` | produkt |
| [D-007](#d-007) | Jeden typ na účet | 2026-10-16 | `tech-lead` | produkt |
| [D-006](#d-006) | Ve sprintu 1 se nikdo neregistruje | 2026-10-16 | `tech-lead` | produkt |
| [D-001](#d-001) | Organizátorské účty ve sprintu 1 vznikají v seedu, ne registrací | board | `tym` | produkt |

## Nahrazená a zrušená

| ID | Rozhodnutí | Datum | Rozhodl | Nahrazeno / důvod |
| --- | --- | --- | --- | --- |
| [D-003](#d-003) | Potvrzování je automatické | board | `tym` | [D-040](#d-040) |
| [D-013](#d-013) | E-mail organizátora v přihlášce: chyba u pole (původní) | 2026-10-16 | `tech-lead` | [D-043](#d-043) |
| [D-027](#d-027) | Landing má jediný vstup „Pro organizátory“ | 2026-10-19 | `tym` | [D-072](#d-072) |

## Detail

<a id="d-001"></a>

### D-001 – Organizátorské účty ve sprintu 1 vznikají v seedu, ne registrací

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** board (bez data) · **Rozhodl:** `tym`
- **Text:** Organizátorské účty ve sprintu 1 vznikají v seedu, ne registrací.
- **Zdroj:** board (zadání)

<a id="d-002"></a>

### D-002 – Platby bez brány a bez banky — ruční zápis

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** board (bez data) · **Rozhodl:** `po`
- **Text:** Platby bez brány a bez banky — ruční zápis. Platí se celá částka, bez záloh.
- **Zdroj:** board (zadání)

<a id="d-003"></a>

### D-003 – Potvrzování je automatické

- **Stav:** nahrazené · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** board (bez data) · **Rozhodl:** `tym`
- **Text:** Potvrzování je automatické.
- **Zdroj:** board (zadání)
- **Nahrazeno v:** [D-040](#d-040)
- **Poznámka:** Nahrazeno rozhodnutím o ručním nebo automatickém vyhodnocování (23. 10.).

<a id="d-004"></a>

### D-004 – Akce = jeden celek s více termíny, každý termín se vyhodnocuje zvlášť

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** board (bez data) · **Rozhodl:** `po`
- **Text:** Akce = jeden celek s více termíny, každý termín se vyhodnocuje zvlášť.
- **Zdroj:** board (zadání)

<a id="d-005"></a>

### D-005 – Produkt se jmenuje Togena

- **Stav:** platné · **Typ:** produkt · **Oblast:** platforma
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** **Produkt se jmenuje Togena** (dříve pracovně kemp.io). Název platí v UI, e-mailech, dokumentaci i technických identifikátorech (compose projekt, DB `togena`).
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-006"></a>

### D-006 – Ve sprintu 1 se nikdo neregistruje

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** **Ve sprintu 1 se nikdo neregistruje.** Landing má dva vstupy: „Pro organizátory – přihlásit se“ a „Mám přihlášku – přihlásit se“. Účet účastníka vzniká odesláním přihlášky.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Změněno v:** [D-027](#d-027), [D-072](#d-072)

<a id="d-007"></a>

### D-007 – Jeden typ na účet

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** **Jeden typ na účet** (`ORGANIZER` / `PARTICIPANT` / `ADMIN`). Jeden e-mail nemůže být organizátor i účastník.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-008"></a>

### D-008 – Účastník dostává magic link místo jednorázového hesla

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** **Účastník dostává magic link místo jednorázového hesla.** Odkaz platí 7 dní a jde použít jednou. První vstup odkazem vynutí nastavení vlastního hesla (min. 8 znaků); dál se přihlašuje heslem. Na S10 si může nechat poslat nový odkaz. Magic link funguje jen pro `PARTICIPANT`.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-009"></a>

### D-009 – Nová přihláška se přiřadí k existujícímu účtu

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Existuje-li účet účastníka k e-mailu, nová přihláška se k němu přiřadí a e-mail obsahuje odkaz na přihlášení (bez vynuceného nastavení hesla, pokud ho už má).
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-010"></a>

### D-010 – Odkaz na přihlášku = neuhodnutelný token /apply/<token>

- **Stav:** platné · **Typ:** technicke · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Odkaz na přihlášku = neuhodnutelný token `/apply/<token>`.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-011"></a>

### D-011 – Stránka po odeslání má tajnou URL

- **Stav:** platné · **Typ:** technicke · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Stránka po odeslání má tajnou URL `/apply/confirmation/<accessToken>`, takže přežije obnovení a může být v e-mailu.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-012"></a>

### D-012 – Další přihláška se stejným e-mailem je povolená

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Další přihláška se stejným e-mailem na stejnou akci je povolená (přiřadí se k účtu).
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-013"></a>

### D-013 – E-mail organizátora v přihlášce: chyba u pole (původní)

- **Stav:** nahrazené · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** ~~E-mail organizátora v přihlášce → chyba u pole „Tento e-mail nelze použít pro přihlášku, zadej jiný.“~~ Nahrazeno 2026-10-25.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Nahrazeno v:** [D-043](#d-043)

<a id="d-014"></a>

### D-014 – Pokles kapacity pod počet potvrzených je povolený

- **Stav:** platné · **Typ:** produkt · **Oblast:** ubytování
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Pokles kapacity pod počet potvrzených je povolený; zobrazí se přebookování. Nikdo se automaticky nepřesouvá — ani dolů, ani nahoru (US-28, US-31 později). Nové přihlášky jdou mezi náhradníky.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-015"></a>

### D-015 – Cena termínu se při vyhodnocení zmrazí do ApplicationTerm.priceCzk

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Cena termínu se při vyhodnocení zmrazí do `ApplicationTerm.priceCzk`.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-016"></a>

### D-016 – Peníze jako celé Kč (Int)

- **Stav:** platné · **Typ:** technicke · **Oblast:** technický základ
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Peníze jako celé Kč (`Int`). VS = globální sekvence `Application.number`. Platby jako řádky `Payment`.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Změněno v:** [D-085](#d-085)

<a id="d-017"></a>

### D-017 – Staging: seed běží při každém startu a je idempotentní

- **Stav:** platné · **Typ:** technicke · **Oblast:** technický základ
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Staging: seed běží při každém startu backendu a je idempotentní (přeskočí se, když v DB je organizace). Selhání seedu start nezastaví. Reset stagingu: v Admineru `TRUNCATE organization CASCADE` a ručně spustit workflow Build & Deploy.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-018"></a>

### D-018 – Celé schéma pro sprint 1 vzniká ve fázi 0

- **Stav:** platné · **Typ:** technicke · **Oblast:** technický základ
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Celé schéma pro sprint 1 vzniká ve fázi 0. Kdo přesto potřebuje migraci: max. jedna na PR, před mergem rebase na `main` a migraci vygenerovat znovu.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-019"></a>

### D-019 – Testy: unit a integrační proti sestavenému serveru

- **Stav:** platné · **Typ:** technicke · **Oblast:** technický základ
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Testy: unit (`*.spec.ts`, bez DB) + integrační (`*.int-spec.ts`) proti sestavenému serveru a Postgresu; v CI jako service container, lokálně v DB `togena_test`.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-020"></a>

### D-020 – Organizace není v URL

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Organizace není v URL; akce jsou seskupené podle pořadatele.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-021"></a>

### D-021 – Stack zůstává ze starteru

- **Stav:** platné · **Typ:** technicke · **Oblast:** technický základ
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Stack zůstává ze starteru. FE podle atomic designu (globální `components/{atoms,molecules,organisms,templates}` + `features/`), shadcn zůstává v `components/ui`.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-022"></a>

### D-022 – Tokeny z Figmy, pravidla z DESIGN.md

- **Stav:** platné · **Typ:** design · **Oblast:** design
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Tokeny z Figmy, pravidla z DESIGN.md.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-023"></a>

### D-023 – Licence MIT

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Licence MIT: zachovat copyright autorů starteru + přidat tým.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-024"></a>

### D-024 – Jazyk: kód anglicky, dokumentace česky, UI lokalizované EN / CZ

- **Stav:** platné · **Typ:** technicke · **Oblast:** technický základ
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Jazyk: kód, DB, API, **URL**, commity a komentáře anglicky; dokumentace, issues a PR česky. Texty v UI a e-mailech jsou **lokalizované EN / CZ** (viz sekce 8, Lokalizace).
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-025"></a>

### D-025 – Práce po vertikálních řezech

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Práce po vertikálních řezech: kdo vezme story, dělá BE + FE + testy.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-026"></a>

### D-026 – Tým a vedení storek

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-16 · **Rozhodl:** `tech-lead`
- **Text:** Vyvíjí celý tým. Proudy: A + landing Jakubkuba9000, B kudrle01, C PJjiry, D Aadikk. Story schvaluje product manager Aadikk.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Změněno v:** [D-071](#d-071)
- **Poznámka:** Sekce 11 PROJEKT.md říká, že se práce nedělí do proudů. Platnost ověřit, viz Q-TEC-08.

<a id="d-027"></a>

### D-027 – Landing má jediný vstup „Pro organizátory“

- **Stav:** nahrazené · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-10-19 · **Rozhodl:** `tym`
- **Text:** Landing má podle Figmy (V08, M07) jediný vstup „Pro organizátory – přihlásit se“; ruší se tím druhý vstup z rozhodnutí 16. 10. Účastník se na přihlášení (S10) dostane odkazem z přihlášení organizátora (S01) nebo z e-mailu.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Nahrazeno v:** [D-072](#d-072)
- **Mění:** [D-006](#d-006)
- **Poznámka:** Kolize se záznamem D-028, viz Q-UCT-10.

<a id="d-028"></a>

### D-028 – Landing má dva vstupy a je jen pro nepřihlášené

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-10-19 · **Rozhodl:** `tym`
- **Text:** Redesign (PR #112): landing má dva vstupy „Jsem organizátor“ a „Jsem účastník“. **Landing je jen pro nepřihlášené** — přihlášeného uživatele `/` (i klik na logo) přesměruje na jeho domovskou stránku (dashboard / moje přihlášky); na landing se dostane po odhlášení.
- **Dotčené US:** [#112](https://github.com/applifting-vsecourse/team-1/issues/112)
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Poznámka:** Potvrzeno rozhodnutím D-072: dva vstupy platí. Kolizi s D-027 řešilo D-072.

<a id="d-029"></a>

### D-029 – Redesign v původním Figma souboru a barvách

- **Stav:** platné · **Typ:** design · **Oblast:** design
- **Datum:** 2026-10-20 · **Rozhodl:** `tech-lead`
- **Text:** Redesign se dělá v původním Figma souboru a v původních barvách (DS / Semantic), barvy „Future Teal“ se nepoužívají. Rohy loga značí jen jednu aktivní věc (položka sidebaru, záložka, krok, karta akce). Pravidla: `docs/FIGMA-REMAKE.md`.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-030"></a>

### D-030 – Vývoj poběží po jednotlivých featurách

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-20 · **Rozhodl:** `pm`
- **Text:** **Vývoj poběží po jednotlivých featurách.** Součástí implementace jsou rovnou odpovídající testy, zejména u zásadních funkcí. Rozhodnuto na [statusu 20. 10.](zapisy/2026-10-20-status.md).
- **Zdroj:** [statusu 20. 10.](../../docs/zapisy/2026-10-20-status.md)

<a id="d-031"></a>

### D-031 – Board rozlišuje design, vývoj, test a business review

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-20 · **Rozhodl:** `pm`
- **Text:** **Board rozlišuje design, vývoj, test a business review.** Business review je poslední krok před schválením PO a stavem Done. Čistě technické tikety, ke kterým se business nemůže věcně vyjádřit, lze po dokončení přesunout rovnou do Done. Rozhodnuto na [statusu 20. 10.](zapisy/2026-10-20-status.md).
- **Zdroj:** [statusu 20. 10.](../../docs/zapisy/2026-10-20-status.md)

<a id="d-032"></a>

### D-032 – Byznysový slovník v repozitáři je závazný

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-20 · **Rozhodl:** `pm`
- **Text:** **Byznysový slovník v repozitáři je závazný** pro názvy v kódu, commitech a issues. Rozhodnuto na [statusu 20. 10.](zapisy/2026-10-20-status.md).
- **Zdroj:** [statusu 20. 10.](../../docs/zapisy/2026-10-20-status.md)

<a id="d-033"></a>

### D-033 – E-maily na stagingu přes Resend

- **Stav:** platné · **Typ:** technicke · **Oblast:** technický základ
- **Datum:** 2026-10-21 · **Rozhodl:** `tech-lead`
- **Text:** E-maily: na stagingu jdou přes **Resend** (klíč z GitHub secretu `RESEND_API_KEY` jako build-arg do image, odesílatel `onboarding@resend.dev`, doručuje jen na adresu Resend účtu `togena.team1@gmail.com`), lokálně do konzole.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-034"></a>

### D-034 – Souhrnný potvrzovací e-mail

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-10-21 · **Rozhodl:** `po`
- **Text:** **Souhrnný potvrzovací e-mail.** Přihlašovatel dostane JEDEN e-mail za celé odeslání formuláře, i když přihlásil víc účastníků (minimum e-mailů). V něm je u každého účastníka stav termínů a u každé přihlášky s potvrzeným termínem její částka k úhradě, bankovní účet organizace a vlastní variabilní symbol (platby se nesčítají). E-mail o změně přihlášky jde za jednu přihlášku. Selhání odeslání neshodí volajícího, jen se zaloguje.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Změněno v:** [D-085](#d-085)

<a id="d-035"></a>

### D-035 – Jeden PR na featuru

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-21 · **Rozhodl:** `tech-lead`
- **Text:** **Jeden PR na featuru:** story jde v jednom PR (BE + FE + testy), nedělí se na backend / frontend ani na „část 1/2“. Větší PR je v pořádku, popis vysvětlí proč.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-036"></a>

### D-036 – Účastník nevidí pořadí náhradníků

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-21 · **Rozhodl:** `tym`
- **Text:** **Účastník nevidí pořadí náhradníků.** API pro účastníka pořadí neposílá. Stavy, které účastník vidí, vycházejí ze [stavového diagramu přihlášky v termínu](procesy/zpracovani-prihlasky/README.md) (US-25; rámce V04 / V06 / M06).
- **Zdroj:** [stavového diagramu přihlášky v termínu](../../docs/procesy/zpracovani-prihlasky/README.md)

<a id="d-037"></a>

### D-037 – Termín může být zdarma (cena 0)

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-21 · **Rozhodl:** `tech-lead`
- **Text:** Termín může být zdarma (cena 0). Cena termínu 0 se zobrazuje jako „Zdarma“, částky k úhradě jako „0 Kč“.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-038"></a>

### D-038 – Organizátor: akce jako karty, sekce akce v sidebaru

- **Stav:** platné · **Typ:** design · **Oblast:** design
- **Datum:** 2026-10-21 · **Rozhodl:** `tech-lead`
- **Text:** **Organizátor: akce jako karty, sekce akce v sidebaru.** Seznam akcí má kartu na akci s řádkem na termín (datum s rokem, název, obsazeno / lůžek); seznam termínů má řádky oddělené linkou místo karet v kartě. Sekce otevřené akce (Přehled, Přihlášky, Ubytování, Termíny) jsou v sidebaru pod „Akce“, ne záložky nad stránkou. Figma O02 / O02a / O24.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-039"></a>

### D-039 – US-14: oba režimy pokojů jsou v rozsahu

- **Stav:** platné · **Typ:** produkt · **Oblast:** ubytování
- **Datum:** 2026-10-22 · **Rozhodl:** `po`
- **Text:** **US-14: oba režimy pokojů jsou v rozsahu** (potvrzeno zadavatelem při implementaci). Přechod na společné pokoje zachová lůžka a odstraní pohlaví pokojů; návrat na dělené pokoje vyžaduje nejprve odstranění společných pokojů. Detaily a odchylky od návrhů: [US-14.md](US-14.md).
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Poznámka:** Původní zápis odkazoval na soubor US-14.md, který v repu neexistuje.

<a id="d-040"></a>

### D-040 – Vyhodnocování přihlášek: ruční nebo automatické

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-23 · **Rozhodl:** `tym`
- **Text:** **Vyhodnocování přihlášek:** organizátor si nastaví ruční, nebo automatické. V obou režimech nastaví pokoje (počet, lůžka na pokoj, dámský / pánský). Náhradníkovi se přihláška v termínu zruší, když nastane první den termínu akce. Procesní a stavové diagramy obou režimů jsou v [přehledu](procesy/zpracovani-prihlasky/README.md), mají přednost před dřívějšími popisy stavů v tomto dokumentu; stav přihlášky se tu už nepopisuje.
- **Zdroj:** [přehledu](../../docs/procesy/zpracovani-prihlasky/README.md)
- **Nahrazuje:** [D-003](#d-003)

<a id="d-041"></a>

### D-041 – US-14: kapacita pokoje bez horního limitu

- **Stav:** platné · **Typ:** produkt · **Oblast:** ubytování
- **Datum:** 2026-10-23 · **Rozhodl:** `po`
- **Text:** **US-14: kapacita pokoje** je kladné celé číslo od 1 bez produktového horního limitu. Původní maximum 20 lůžek se ruší v obou režimech pokojů (změna zadání).
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-042"></a>

### D-042 – Dashboard organizátora se ruší

- **Stav:** platné · **Typ:** produkt · **Oblast:** přehledy
- **Datum:** 2026-10-25 · **Rozhodl:** `tech-lead`
- **Text:** **Dashboard organizátora se ruší.** Po přihlášení organizátor přistane na seznamu akcí (`/organizer` přesměruje na `/organizer/events`), sidebar má jen „Akce“ a „Organizace“. Panel „Co vyžaduje pozornost“ přijde nad seznam akcí, až budou data z US-29 / US-52. Účet (avatar, jméno, e-mail) je dole v sidebaru a v mobilním draweru, menu se otevírá nahoru (Nastavení účtu, Odhlásit se). Horní lišta má roli, jazyk a vzhled; na mobilu menu, logo, jazyk a vzhled. Sekce akce jsou na mobilu rozbalovací menu s aktuální sekcí („Přehled · 1 z 5“) místo posuvných záložek. Návrh N1–N9, Figma stránka „HF / 07 Návrh 25. 10.“. **Zrušení dashboardu bylo změněno rozhodnutím 2026-10-28** (dashboard se vrací).
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Změněno v:** [D-050](#d-050)

<a id="d-043"></a>

### D-043 – E-mail organizátora v přihlášce: obecná chyba VALIDATION_FAILED

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-25 · **Rozhodl:** `tech-lead`
- **Text:** E-mail organizátora nebo admina v přihlášce → obecná chyba `VALIDATION_FAILED` („Některá pole nejsou vyplněná správně.“), ne vlastní kód. Veřejný formulář tak neprozradí, že e-mail patří organizátorovi (audit 2026-10-25). Přihláška má nejvýš 10 účastníků, jméno i příjmení nejvýš 100 znaků.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Nahrazuje:** [D-013](#d-013)

<a id="d-044"></a>

### D-044 – Nálezy z testování (#153)

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-26 · **Rozhodl:** `tech-lead`
- **Text:** **Nálezy z testování (#153).** Smazat jde jen akci bez přihlášek (`DELETE /api/organizer/events/:eventId`, jinak 409 `EVENT_HAS_APPLICATIONS`); smaže i termíny a pokoje. Archivace akce s přihláškami je mimo rozsah. Filtr úhrady v seznamu přihlášek má stavy Nezaplaceno / Částečně zaplaceno / Zaplaceno / Přeplatek (`?payment=`). U přihlášky bez částky k úhradě (jen náhradník) se platba nezapisuje; u zaplacené je „Zapsat platbu“ jen vedlejší akce. Po odeslání za více účastníků je nahoře součet k úhradě, platby zůstávají po účastnících (vlastní VS).
- **Dotčené US:** [#153](https://github.com/applifting-vsecourse/team-1/issues/153)
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-045"></a>

### D-045 – Duplicitní přihláška (#160, US-23)

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-26 · **Rozhodl:** `tym`
- **Text:** **Duplicitní přihláška (#160, US-23).** Odeslání odmítne (409 `APPLICATION_DUPLICATE`, nic se neuloží), když stejný účastník už je přihlášený na některý z vybraných termínů téže akce, i v téže přihlášce nebo s jiným e-mailem. Účastník je stejný při shodném jménu a příjmení bez ohledu na velikost písmen, diakritiku a nadbytečné mezery („Jan Novák“ = „jan NOVAK“) a při shodném datu narození. Jiný termín stejné akce duplicita není. Kontrola běží v transakci pod zámkem akce, takže drží i při souběhu. Aby odmítnuté odeslání nezanechalo ani účet přihlašovatele, zpracovávají se odeslání jedné akce po jednom v procesu backendu (`KeyedMutex` v `ApplicationsService.submit`); **omezení:** to platí jen pro jednu instanci backendu (staging i produkce zatím běží v jedné). Při více instancích by bylo potřeba zámek v databázi, jinak může při souběhu zůstat účet bez přihlášky. Chyba nese `params` (`participant`, `term`) pro přeloženou hlášku.
- **Dotčené US:** [#160](https://github.com/applifting-vsecourse/team-1/issues/160)
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-046"></a>

### D-046 – Oprava číslování sprintů

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-27 · **Rozhodl:** `tym`
- **Text:** **Oprava číslování sprintů.** Sprinty se dosud číslovaly chybně: poslední dokončený sprint, vedený jako „sprint 1“, byl ve skutečnosti **sprint 2**. Další sprint se čísluje správně jako **sprint 3**; číslo 2 se nepoužije, protože odpovídá už dokončenému sprintu. Existující označení (label `sprint 1`, odkazy na „sprint 1“) se zpětně nemění. Rozhodnuto na [statusu 27. 10.](zapisy/2026-10-27-status.md).
- **Zdroj:** [statusu 27. 10.](../../docs/zapisy/2026-10-27-status.md)

<a id="d-047"></a>

### D-047 – Sprint se vede jako pole Sprint v GitHub Projects

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-27 · **Rozhodl:** `pm`
- **Text:** **Sprint se vede jako pole Sprint v GitHub Projects**, ne štítkem ani milestonem. Rozhodnuto na [statusu 27. 10.](zapisy/2026-10-27-status.md).
- **Zdroj:** [statusu 27. 10.](../../docs/zapisy/2026-10-27-status.md)

<a id="d-048"></a>

### D-048 – MVP / nice to have se vede milestonem

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-27 · **Rozhodl:** `pm`
- **Text:** **MVP / nice to have se vede milestonem**, pole Priority se odstraní. Rozhodnuto na [statusu 27. 10.](zapisy/2026-10-27-status.md).
- **Zdroj:** [statusu 27. 10.](../../docs/zapisy/2026-10-27-status.md)

<a id="d-049"></a>

### D-049 – Zdroj designové pravdy je Design systém ve Figmě

- **Stav:** platné · **Typ:** design · **Oblast:** design
- **Datum:** 2026-10-27 · **Rozhodl:** `pm`
- **Text:** **Zdroj designové pravdy je Design systém ve Figmě** (sekce Organizátor). Figma je hlavní zdroj, možné jsou odůvodněné implementační odchylky a každá změna designu se promítne zpět do Figmy ([status 20. 10.](zapisy/2026-10-20-status.md)). Rozhodnuto na [statusu 27. 10.](zapisy/2026-10-27-status.md).
- **Zdroj:** [status 20. 10.](../../docs/zapisy/2026-10-20-status.md); [statusu 27. 10.](../../docs/zapisy/2026-10-27-status.md)

<a id="d-050"></a>

### D-050 – Dashboard organizátora se vrací

- **Stav:** platné · **Typ:** produkt · **Oblast:** přehledy
- **Datum:** 2026-10-28 · **Rozhodl:** `pm`
- **Text:** **Dashboard organizátora se vrací** a mění tím rozhodnutí z 2026-10-25 („Dashboard organizátora se ruší“); dashboard požaduje PO. Dashboard je zaměřený na **actionability**: ukazuje, co organizátor má řešit teď (například přihlášky čekající na vyhodnocení, nezaplacené přihlášky), a vede ho přímo k akci. Panel „Co vyžaduje pozornost“ z rozhodnutí 2026-10-25 se tím stává jádrem dashboardu, ne pruhem nad seznamem akcí. Zbytek rozhodnutí 2026-10-25 (účet dole v sidebaru, horní lišta, sekce akce jako rozbalovací menu na mobilu) platí dál. Obsah, route a umístění v navigaci doplní návrh a story; do té doby platí `/organizer` → `/organizer/events`.
- **Zdroj:** [PROJEKT.md, sekce 9 (původní zápis)](../../docs/PROJEKT.md)
- **Mění:** [D-042](#d-042)

<a id="d-051"></a>

### D-051 – Platba se váže ke konkrétnímu termínu

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-10-28 · **Rozhodl:** `pm`
- **Text:** **Platba se váže ke konkrétnímu termínu.** Systém průběžně ukazuje zbývající dluh podle potvrzených termínů a evidovaných plateb. Vratky ani storno poplatky se nevytvářejí automaticky při odhlášení; vratka se eviduje zápornou platbou. Rozhodnuto na [statusu s PO 28. 10.](zapisy/2026-10-28-status-s-po.md).
- **Zdroj:** [statusu s PO 28. 10.](../../docs/zapisy/2026-10-28-status-s-po.md)

<a id="d-052"></a>

### D-052 – Ubytování, pokoje, jejich kapacity a dostupnost se řeší po jednotlivých termínech

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-28 · **Rozhodl:** `pm`
- **Text:** **Ubytování, pokoje, jejich kapacity a dostupnost se řeší po jednotlivých termínech**, ne za celou akci. Mění tím dosavadní pravidlo, že pokoj platí pro všechny termíny akce (sekce 5, US-14). Rozhodnuto na [statusu s PO 28. 10.](zapisy/2026-10-28-status-s-po.md).
- **Zdroj:** [statusu s PO 28. 10.](../../docs/zapisy/2026-10-28-status-s-po.md)
- **Poznámka:** Mění pravidlo ze sekce 5 PROJEKT.md, že pokoj platí pro všechny termíny akce (US-14).

<a id="d-053"></a>

### D-053 – Název termínu je volitelný

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-28 · **Rozhodl:** `pm`
- **Text:** **Název termínu je volitelný**, termín se primárně definuje datem. Rozhodnuto na [statusu s PO 28. 10.](zapisy/2026-10-28-status-s-po.md).
- **Zdroj:** [statusu s PO 28. 10.](../../docs/zapisy/2026-10-28-status-s-po.md)

<a id="d-054"></a>

### D-054 – US-26: čtecí přehled kapacit jen pro akce s dělením podle pohlaví

- **Stav:** platné · **Typ:** produkt · **Oblast:** ubytování
- **Datum:** 2026-10-23 · **Rozhodl:** `po`
- **Text:** Upřesnění zadavatele 2026-10-23 pro US-26: navazuje na US-14, zachovává volitelné pohlaví v datovém modelu a ruší původní maximum 20 lůžek. Výpočet a správa kapacit v US-26 jsou jen pro akce s dělením podle pohlaví; společná kapacita se implementuje později. Při otevření akce v režimu SHARED se v přehledu US-26 zobrazí informace o nepodporovaném režimu. US-26 je pouze čtecí přehled; veškeré úpravy pokojů patří do US-14.
- **Zdroj:** [PROJEKT.md, sekce 10 (původní zápis)](../../docs/PROJEKT.md)

<a id="d-055"></a>

### D-055 – Jazyk magic link e-mailu je jazyk UI při žádosti

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-10-30 · **Rozhodl:** `tech-lead`
- **Text:** Jazyk magic link e-mailu je jazyk UI v okamžiku žádosti (varianta a z #183); chybí-li, použije se en.
- **Dotčené US:** [#183](https://github.com/applifting-vsecourse/team-1/issues/183)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/231)
- **Z otázek:** `Q-KOM-07`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (6cdb931), které jazyky platí pro který e-mail
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (6cdb931), totéž

<a id="d-056"></a>

### D-056 – Potvrzená → Náhradník ručně organizátorem

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Ano, systém to má umožnit.
- **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Změněno v:** [D-074](#d-074), [D-077](#d-077)
- **Z otázek:** `Q-PRI-14`
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: hotovo (d4964be), přechod Potvrzená s dluhem → Náhradník
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: hotovo (d4964be), zkontrolovat, zda přechod platí i v auto režimu
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (d4964be), řádek e-mailu č. 3 platí i pro tento přechod; č. 1 v auto režimu má stejný rozpor
- **Poznámka:** Tech lead: přechod je povolený v backendu i UI („Move to waitlist“), zapracováno v b68f73e a propsané do navazujících PR. Diagram a EMAILY.md zůstávají na PM.

<a id="d-057"></a>

### D-057 – Organizátor smí zrušit náhradníka kdykoli

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Je v pořádku, organizátor může zrušit náhradníka kdykoli.
- **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Změněno v:** [D-077](#d-077)
- **Z otázek:** `Q-PRI-15`
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: hotovo (d4964be), Náhradník → Zrušená i organizátorem
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: hotovo (d4964be), zkontrolovat v auto režimu
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (d4964be), řádek 6 platí jen pro první den, doplnit řádek pro zrušení organizátorem

<a id="d-058"></a>

### D-058 – Přechody z K vyhodnocení doplní US-102

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Souhlas, přechody doplní US-102 (#195).
- **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Z otázek:** `Q-PRI-16`

<a id="d-059"></a>

### D-059 – US-28 stačí vědomé potvrzení nad kapacitu, přistýlka přijde s US-80

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Souhlas, stačí vědomé potvrzení; přistýlka přijde s US-80.
- **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Z otázek:** `Q-PRI-17`

<a id="d-060"></a>

### D-060 – Blok „Stav v termínech“: merge neblokuje, UI/UX dolaďovat zpětně

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Merge neblokuje; mergnout a UI/UX dolaďovat zpětně ticketem enhancement.
- **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Z otázek:** `Q-PRI-18`

<a id="d-061"></a>

### D-061 – Telefon se sbírá novým ticketem, ne v US-30

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Neřešit v tomto PR; mergnout, telefon sbírat novým ticketem (někdy by tam určitě měl být).
- **Dotčené US:** [US-30](https://github.com/applifting-vsecourse/team-1/issues/30)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/234)
- **Z otázek:** `Q-PRI-19`

<a id="d-062"></a>

### D-062 – Režim pokojů se může lišit po termínech

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Systém má umožnit odlišný režim pokojů v odlišných termínech. „Implementováno“ v #80 znamená, že to řeší odkazovaný ticket, ne že je hotovo; pravdu říká stav #192 (US-99).
- **Dotčené US:** [US-30](https://github.com/applifting-vsecourse/team-1/issues/30)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/234)
- **Z otázek:** `Q-NAS-08`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (d4964be), řádek 71 říká „Režim pokojů zůstává na úrovni akce“ a datový model má Event.roomMode: rozpor s rozhodnutím

<a id="d-063"></a>

### D-063 – Společná fronta náhradníků, když pokoj nemá pohlaví

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Ano; pokud pokoj nemá dané pohlaví, je fronta přihlášek jedna pro obě pohlaví.
- **Dotčené US:** [US-30](https://github.com/applifting-vsecourse/team-1/issues/30)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/234)
- **Z otázek:** `Q-NAS-09`
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/`: hotovo (d4964be), pravidlo pořadníku (skupina lůžek), místo určí model-update

<a id="d-064"></a>

### D-064 – Náhradník se ruší od půlnoci českého času prvního dne termínu

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Zatím půlnoc českého času; platforma zatím není mezinárodní. Detaily procesu zjistí PM od PO, případně vznikne ticket enhancement.
- **Dotčené US:** [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/236)
- **Z otázek:** `Q-PRI-20`
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: hotovo (d4964be), Náhradník → Zrušená: půlnoc Europe/Prague prvního dne termínu
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: hotovo (d4964be), totéž

<a id="d-065"></a>

### D-065 – Zrušení termínu zruší všechny přihlášky ve všech stavech

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Při zrušení termínu se ruší všichni účastníci ve všech stavech. UX má organizátora dostatečně upozornit na kritickou a nevratnou akci.
- **Dotčené US:** [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/236)
- **Z otázek:** `Q-PRI-21`
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/`: hotovo (d4964be), chybí proces zrušení termínu akce (US-13)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (d4964be), chybí e-mail při zrušení termínu

<a id="d-066"></a>

### D-066 – Sdružení e-mailů za více termínů až v US-116

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Stačí vyřešit později (US-116).
- **Dotčené US:** [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/236)
- **Z otázek:** `Q-KOM-11`

<a id="d-067"></a>

### D-067 – „Otevření přihlášek“ = akce splní všechny požadavky a vznikne link

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Aktuálně moment, kdy akce splní všechny požadavky (termín, ubytování atd.); pak se vygeneruje link a přihlašování se spustí. V budoucnu ruční nebo plánované spuštění a ruční pozastavení přihlášek (např. při výpadku ubytování).
- **Dotčené US:** [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/238)
- **Z otázek:** `Q-NAS-11`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (d4964be), sekce 5: definice „otevření přihlášek“ a výhled (plánované spuštění, pozastavení)

<a id="d-068"></a>

### D-068 – Zamčení režimu vyhodnocování bez přihlášky je v pořádku

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** As-is stav je v pořádku; v budoucnu by měla jít změna do první přihlášky nebo nějaká kombinace.
- **Dotčené US:** [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194)
- **Zdroj:** [PR, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/238)
- **Změněno v:** [D-083](#d-083)
- **Z otázek:** `Q-NAS-12`

<a id="d-069"></a>

### D-069 – Uživatel si nastaví preferovaný jazyk (aplikace i e-maily)

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Uživatel by měl mít možnost nastavit si preferovaný jazyk. V něm se bude defaultně spouštět aplikace a odesílat e-maily. Pro PR #231 se nic nemění, vše zůstává jak je; PM založí ticket enhancement.
- **Dotčené US:** [#183](https://github.com/applifting-vsecourse/team-1/issues/183)
- **Zdroj:** [PR #231, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/231#issuecomment-6545470005)
- **Změněno v:** [D-078](#d-078)
- **Z otázek:** `Q-KOM-08`
- **Dokumentace:** `docs/PROJEKT.md`: ceka, pravidlo jazyka aplikace a e-mailů: preferovaný jazyk uživatele (zapsat při zadání ticketu)

<a id="d-070"></a>

### D-070 – Detail přihlášky náhradníka říká „Zatím nic neplaťte“

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** U náhradníka na detailu přihlášky se místo „0 Kč do potvrzení“ zobrazuje „Zatím nic neplaťte“ (je to UX přívětivější). Zapracováno v PR #227 (ce349ed).
- **Dotčené US:** [#225](https://github.com/applifting-vsecourse/team-1/issues/225)
- **Zdroj:** [PR #227, komentář PM](https://github.com/applifting-vsecourse/team-1/pull/227#issuecomment-6545434093)
- **Z otázek:** `Q-PRI-13`
- **Poznámka:** Ověřit, zda stejný text mají rámce ve Figmě (V04, V06).

<a id="d-071"></a>

### D-071 – Práce se nedělí do proudů

- **Stav:** platné · **Typ:** proces · **Oblast:** tým a proces
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Práce se nedělí do proudů A–D, rozhodnutí z 16. 10. o proudech neplatí. Platí sekce 11 PROJEKT.md: tým se domlouvá ad hoc a sdílené soubory se mění jen v rozsahu své story. Zbytek rozhodnutí „Tým a vedení storek“ (vyvíjí celý tým, story schvaluje product manager) platí dál.
- **Zdroj:** [PR #242, odpověď PM na Q-TEC-08](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Mění:** [D-026](#d-026)
- **Z otázek:** `Q-TEC-08`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (065fbdc), řádek 105 odkazuje na „proud C“; odstranit zmínku o proudu

<a id="d-072"></a>

### D-072 – Landing má dva vstupy „Jsem organizátor“ a „Jsem účastník“

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Landing pro nepřihlášené má dva vstupy: „Jsem organizátor“ a „Jsem účastník“ (jak je v aplikaci). Rozhodnutí z 19. 10. o jediném vstupu „Pro organizátory – přihlásit se“ (podle Figmy V08, M07) neplatí; Figma se s kódem sladí.
- **Zdroj:** [PR #242, odpověď PM na Q-UCT-10](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Nahrazuje:** [D-027](#d-027)
- **Mění:** [D-006](#d-006)
- **Z otázek:** `Q-UCT-10`
- **Poznámka:** Rámce V08 a M07 ve Figmě kreslí jediný vstup; sladit s designem (návazný úkol u Q-UCT-10).

<a id="d-073"></a>

### D-073 – Přihláška přesunutá z Potvrzené mezi náhradníky se řadí podle data přijetí

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Přihláška přesunutá z Potvrzené mezi náhradníky se v pořadníku řadí podle data přijetí, tedy stejně jako ostatní náhradníci. Může tak skočit před dřívější náhradníky.
- **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28)
- **Zdroj:** [odpověď PM v chatu na Q-PRI-22 (dotaz tech leada v PR #232)](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6545014573)
- **Z otázek:** `Q-PRI-22`
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/`: hotovo (d4964be), pravidlo pořadí náhradníků (podle data přijetí i po přesunu z Potvrzené), místo určí model-update
- **Poznámka:** Odpovídá chování v main (PR #232), kód se nemění.

<a id="d-074"></a>

### D-074 – Přechod Potvrzená → Náhradník má vlastní e-mail jako samostatný stav v EMAILY.md

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Přechod Potvrzená → Náhradník se v EMAILY.md zapíše jako nový, samostatný řádek (vlastní e-mail s vlastním textem) s dalším volným číslem 13; stávající čísla e-mailů se nepřečíslovávají. E-mail č. 3 zůstává jen pro K vyhodnocení → Náhradník. Text „Jste náhradník“ platí pro č. 3 i pro č. 1 v automatickém režimu.
- **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28)
- **Zdroj:** [odpověď PM v chatu na Q-KOM-09 (PR #232, odpověď tech leada)](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6545014573)
- **Mění:** [D-056](#d-056)
- **Z otázek:** `Q-KOM-09`
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (d4964be), nový řádek č. 13 e-mailu pro Potvrzená → Náhradník (odvolané potvrzení); stávající čísla 1 až 12 se nemění; č. 3 jen K vyhodnocení → Náhradník; č. 1 auto ponechat „Jste náhradník“
- **Poznámka:** Výklad „zapsat jako nový stav“: nový řádek (e-mail) v EMAILY.md, ne nový stav přihlášky. Znění textu se doladí v model-update. Původní čísla e-mailů zůstávají. Kód používá pro tento přechod e-mail č. 3, po zápisu bude potřeba ticket na samostatnou šablonu.

<a id="d-075"></a>

### D-075 – V angličtině je datum narození DD/MM/YYYY (en-GB)

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** V angličtině se datum narození zobrazuje a zadává jako DD/MM/YYYY (en-GB), například 25/10/1990.
- **Dotčené US:** [#177](https://github.com/applifting-vsecourse/team-1/issues/177)
- **Zdroj:** [odpověď PM v chatu na Q-PRI-12 (PR #226, nejasnosti k byznys pravidlům)](https://github.com/applifting-vsecourse/team-1/pull/226)
- **Z otázek:** `Q-PRI-12`
- **Poznámka:** Potvrzuje stav zapracovaný v PR #226 (sloučeno). Q-PRI-11 (formát podle jazyka aplikace, nebo systému) zůstává otevřená.

<a id="d-076"></a>

### D-076 – Při zrušení termínu se zaplacené platby vracejí, archivované přihlášky se nerulí

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Při zrušení termínu akce se zaplacené platby vracejí účastníkům. Zrušení termínu se netýká archivovaných přihlášek (termín už proběhl).
- **Dotčené US:** [US-13](https://github.com/applifting-vsecourse/team-1/issues/13)
- **Zdroj:** [odpověď PM v chatu při úpravě modelů k D-065](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/zruseni-terminu.yaml`: hotovo (d4964be), proces zrušení termínu včetně vrácení plateb
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (d4964be), řádek 15, e-mail o zrušení termínu s informací o vrácení plateb
- **Poznámka:** Kdo platby vrací a kdy (organizátor, lhůta), PM nerozhodl; v modelu je úloha organizátora. Zvážit ticket a otázku na PO.

<a id="d-077"></a>

### D-077 – Přesun mezi náhradníky jen u Potvrzené s dluhem, ruční zásahy platí v obou režimech

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Přesun mezi náhradníky platí jen pro Potvrzenou s dluhem, ne pro Potvrzenou a zaplacenou. Přesun mezi náhradníky i zrušení náhradníka organizátorem platí v ručním i v automatickém režimu. Zrušení náhradníka organizátorem má vlastní e-mail (č. 14).
- **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28)
- **Zdroj:** [odpověď PM v chatu při úpravě modelů k D-056 a D-057](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Mění:** [D-056](#d-056), [D-057](#d-057)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/`: hotovo (d4964be), obě prihlaska-v-terminu-zivotni-cyklus.yaml a zpracovani-prihlasky.yaml, EMAILY.md řádky 13 a 14

<a id="d-078"></a>

### D-078 – Preferovaný jazyk uživatele přebíjí jazyk přihlášky u e-mailů o změně přihlášky

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Preferovaný jazyk uživatele přebíjí jazyk přihlášky u e-mailů o změně přihlášky. Když ho uživatel nenastavil, platí jazyk jeho první přihlášky.
- **Zdroj:** [odpověď PM v chatu k návrhům ticketů (PM rutina, krok 3)](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Mění:** [D-069](#d-069)
- **Z otázek:** `Q-KOM-08`
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (c8c2f0a), pravidlo „E-maily jdou v jazyce přihlášky (Application.locale)“ doplnit: u e-mailů o změně přihlášky vítězí preferovaný jazyk uživatele
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (c8c2f0a), lokalizace: pořadí jazyka (preferovaný jazyk uživatele, jinak jazyk přihlášky)
- **Poznámka:** Fallback („jazyk první přihlášky“) potvrdil PM v chatu. E-mail č. 1 zůstává v jazyce přihlášky.

<a id="d-079"></a>

### D-079 – Telefon účastníka je ve formuláři přihlášky povinný, u nezletilých se neřeší

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Telefon je ve formuláři přihlášky povinný. Telefon u nezletilých (zákonného zástupce) se zatím neřeší. Právní základ (GDPR) PM nezodpověděl.
- **Zdroj:** [odpověď PM v chatu k návrhům ticketů (PM rutina, krok 3)](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Z otázek:** `Q-PRI-19`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (c8c2f0a), formulář přihlášky a datový model: povinný telefon účastníka
- **Poznámka:** Otevřené: právní základ sběru telefonu (GDPR) a telefon zástupce u nezletilých (US-07).

<a id="d-080"></a>

### D-080 – Platby při zrušení termínu vrací organizátor bez lhůty a bez potvrzení

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Platby při zrušení termínu vrací organizátor. Systém na to nemá limit, je to na organizátorovi. Potvrzení o vrácení se zatím neposílá.
- **Dotčené US:** [#13](https://github.com/applifting-vsecourse/team-1/issues/13)
- **Zdroj:** [odpověď PM v chatu k návrhům ticketů (PM rutina, krok 3)](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Z otázek:** `Q-PRI-21`
- **Poznámka:** Upřesňuje D-076. Model zruseni-terminu.yaml už má úlohu „Vrátit zaplacené platby“ (role organizátor). Nezodpovězeno: vrácení nepotvrzených převodů.

<a id="d-081"></a>

### D-081 – Plánované spuštění přihlášek platí pro akci, v čase Europe/Prague, lze zrušit do spuštění

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Plánované spuštění přihlášek se týká akce, čas se zadává v zóně Europe/Prague a organizátor ho může zrušit, dokud spuštění nenastalo.
- **Zdroj:** [odpověď PM v chatu k návrhům ticketů (PM rutina, krok 3)](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Z otázek:** `Q-NAS-11`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (c8c2f0a), sekce 5, výhled plánovaného spuštění: pro akci, Europe/Prague, zrušitelné do spuštění
- **Poznámka:** Upřesňuje výhled z D-067.

<a id="d-082"></a>

### D-082 – Pozastavení přihlášek platí pro akci, důvod účastník nevidí, nová přihláška skončí chybou

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Pozastavení přihlášek platí pro celou akci. Účastník nevidí důvod. Při pozastavení dostane chybu, že bylo přihlašování pozastaveno (týká se i rozpracované přihlášky).
- **Zdroj:** [odpověď PM v chatu k návrhům ticketů (PM rutina, krok 3)](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Z otázek:** `Q-NAS-11`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (c8c2f0a), sekce 5, výhled pozastavení: pro akci, bez důvodu, chyba při odeslání
- **Poznámka:** Upřesňuje výhled z D-067. Výklad: třetí odpověď („hlásí chybu“) se týkala rozpracované přihlášky.

<a id="d-083"></a>

### D-083 – Režim vyhodnocování lze měnit, dokud je počet přijatých přihlášek 0

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** Režim vyhodnocování lze měnit, dokud je počet přijatých přihlášek 0. Po první přijaté přihlášce už ne.
- **Zdroj:** [odpověď PM v chatu k návrhům ticketů (PM rutina, krok 3)](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Mění:** [D-068](#d-068)
- **Z otázek:** `Q-NAS-12`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (c8c2f0a), pravidlo zamčení režimu vyhodnocování: od první přijaté přihlášky
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/README.md`: hotovo (c8c2f0a), řádek „Nastavení akce“: režim lze změnit do první přihlášky
- **Poznámka:** Konkretizuje D-068 (jde o změnu do první přihlášky, ne o kombinaci).

<a id="d-084"></a>

### D-084 – Datový model režimu pokojů po termínech se přepíše na nový systém bez migrace

- **Stav:** platné · **Typ:** technicke · **Oblast:** ubytování
- **Datum:** 2026-10-31 · **Rozhodl:** `pm`
- **Text:** U #192 (US-99) se režim pokojů po termínech zavede jako nový systém, celé se resetuje. Na stagingu nejsou reálná data, dopad na business je nulový, migrace nebude.
- **Dotčené US:** [#192](https://github.com/applifting-vsecourse/team-1/issues/192)
- **Zdroj:** [odpověď PM v chatu k návrhům ticketů (PM rutina, krok 3)](https://github.com/applifting-vsecourse/team-1/pull/242)
- **Z otázek:** `Q-NAS-08`
- **Dokumentace:** `docs/PROJEKT.md`: hotovo (c8c2f0a), sekce 8: Event.roomMode (ř. 91) po US-99 odstranit, režim je po termínech
- **Poznámka:** Navazuje na D-062.

<a id="d-085"></a>

### D-085 – Dvouúrovňový variabilní symbol

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-11-01 · **Rozhodl:** `pm`
- **Text:** VS = `Application.number × 1000 + Term.number`. `…000` je souhrn přihlášky (zaplatí aktuální dluh), `…nnn` je platba za jeden termín. VS se neukládá, počítá se a čte celočíselně (`vs / 1000`, `vs % 1000`). Souhrnný VS platí vždy, částka se bere z aktuálního dluhu v okamžiku zápisu. Hodnoty od 9 000 000 000 jsou vyhrazeny pro souhrn odeslání formuláře (proto `Application.number` < 9 000 000). Věta „platby se nesčítají“ z D-034 platí jen pro platby různých přihlášek.
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [ticket US-137 (#174), rozhodnutí PM v konverzaci 2026-11-01](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Mění:** [D-016](#d-016), [D-034](#d-034)
- **Dokumentace:** `docs/PROJEKT.md`: ceka, řádek „Variabilní symbol = číslo přihlášky“ (sekce 5) přepsat na dvouúrovňový VS; uvést vyhrazený rozsah VS od 9 000 000 000 a omezení Application.number < 9 000 000
- **Dokumentace:** `docs/SLOVNIK.md`: ceka, Variabilní symbol: dvouúrovňový, patří přihlášce a přihlášce v termínu; class diagram
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: ceka, platební údaje u e-mailů č. 2, 5, 7: souhrnný VS a VS každé potvrzené přihlášky v termínu

<a id="d-086"></a>

### D-086 – `Term.number` je neměnné číslo termínu v akci

- **Stav:** platné · **Typ:** technicke · **Oblast:** platby
- **Datum:** 2026-11-01 · **Rozhodl:** `pm`
- **Text:** Pořadové číslo 1 až 999 v rámci akce, přidělené při vzniku termínu (nejvyšší + 1). Nikdy se nemění ani nepoužije znovu, ani po zrušení termínu (zrušený termín číslo drží). Limit tedy platí včetně zrušených termínů; 1000. termín se odmítne chybou `TERM_LIMIT_REACHED`.
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [ticket US-137 (#174), rozhodnutí PM v konverzaci 2026-11-01](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Dokumentace:** `docs/PROJEKT.md`: ceka, datový model: Term.number

<a id="d-087"></a>

### D-087 – Souhrnná platba se rozděluje od nejstaršího termínu

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-11-01 · **Rozhodl:** `pm`
- **Text:** Platba na souhrnný VS se rozdělí na potvrzené přihlášky v termínu s dluhem, od nejstaršího data konání (shoda: podle `Term.number`), každou nejvýše do výše jejího dluhu. Nedoplatek zůstane na nejpozdějším termínu. Přeplatek se zapíše na poslední potvrzenou přihlášku v termínu v tomto pořadí (bez potvrzené na poslední přihlášku v termínu).
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [ticket US-137 (#174), rozhodnutí PM v konverzaci 2026-11-01](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Z otázek:** `Q-PLA-11`, `Q-PLA-14`
- **Dokumentace:** `docs/SLOVNIK.md`: ceka, pojmy Souhrn přihlášky a Příjem; pravidlo rozdělení
- **Poznámka:** Rozhodl PM; PO ověří (Q-PLA-14).

<a id="d-088"></a>

### D-088 – Platba na VS bez dluhu je přeplatek přihlášky v termínu

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-11-01 · **Rozhodl:** `pm`
- **Text:** Platba na VS přihlášky v termínu bez dluhu (náhradník, zrušená, již zaplacená) se zapíše jako přeplatek té přihlášky v termínu. Nic se neodmítá. Přeplatek se nepřevádí na jinou přihlášku v termínu a vrací se vratkou. Platba zrušeného termínu nebo náhradníka zůstává u své přihlášky v termínu.
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [ticket US-137 (#174), rozhodnutí PM v konverzaci 2026-11-01](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Z otázek:** `Q-PLA-11`
- **Dokumentace:** `docs/SLOVNIK.md`: ceka, Přeplatek patří přihlášce v termínu
- **Poznámka:** Upřesňuje D-051.

<a id="d-089"></a>

### D-089 – Příjem = řádky `Payment` po přihlášce v termínu se společným `receiptId`

- **Stav:** platné · **Typ:** technicke · **Oblast:** platby
- **Datum:** 2026-11-01 · **Rozhodl:** `pm`
- **Text:** Platba na souhrnný VS vytvoří víc řádků se stejným `receiptId`. Zrušení jednoho řádku zruší celou skupinu. Vratka se zadává přes `termId` (bez něj chyba) a je jeden záporný řádek na jedné přihlášce v termínu, omezený jejím přeplatkem. Zápis: cesta plateb přihlášky + volitelný `termId` (bez něj souhrn).
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [ticket US-137 (#174), rozhodnutí PM v konverzaci 2026-11-01](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Dokumentace:** `docs/PROJEKT.md`: ceka, datový model: Payment.applicationTermId, Payment.receiptId; API plateb s volitelným termId
- **Poznámka:** Upřesňuje D-016 a D-051.

<a id="d-090"></a>

### D-090 – Stará platební data se smažou, seed se přepíše

- **Stav:** platné · **Typ:** technicke · **Oblast:** platby
- **Datum:** 2026-11-01 · **Rozhodl:** `pm`
- **Text:** Existují jen demo a seed data. Migrace stávající platby smaže, nová seed data dodá US-137, dosavadní VS přihlášky (4 číslice) přestává platit. Na stagingu se seed přeskočí (organizace už existuje), nová data se tam dostanou jednorázovým re-seedem.
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [ticket US-137 (#174), rozhodnutí PM v konverzaci 2026-11-01](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Z otázek:** `Q-PLA-10`

<a id="d-091"></a>

### D-091 – Jedna platba za celé odeslání formuláře je záměr, mimo US-137

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-11-01 · **Rozhodl:** `pm`
- **Text:** Přihlašovatel, který přihlásí víc účastníků na víc termínů, má mít možnost zaplatit jednou platbou a jedním QR kódem. Řeší navazující ticket; US-137 ho nesmí blokovat: rozdělení platby je obecná funkce nad seznamem přihlášek v termínu, příjem může vést přes víc přihlášek a rozsah VS od 9 000 000 000 je vyhrazen.
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [ticket US-137 (#174), rozhodnutí PM v konverzaci 2026-11-01](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Poznámka:** Zpřesňuje zápis z 26. 10. (po odeslání za více účastníků je nahoře součet k úhradě). Ticket k založení.

<a id="d-092"></a>

### D-092 – Popis, místo a kontakt jsou povinné jen pro zveřejnění v katalogu

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-11-02 · **Rozhodl:** `pm`
- **Text:** Veřejná stránka akce: popis, místo a kontakt (e-mail) jsou povinné jen v okamžiku, kdy organizátor akci zveřejňuje v katalogu. Bez zveřejnění je lze nechat prázdné.
- **Dotčené US:** [US-122](https://github.com/applifting-vsecourse/team-1/issues/215)
- **Zdroj:** [ticket US-122 (#215), odpověď PM bod 1](https://github.com/applifting-vsecourse/team-1/issues/215#issuecomment-6581262940)
- **Dokumentace:** `docs/PROJEKT.md`: ceka, veřejná stránka akce: povinnost polí jen pro zveřejnění v katalogu
- **Poznámka:** Souvisí s Q-NAS-05 (seznam polí veřejné stránky); ta zůstává otevřená do odsouhlasení celého seznamu polí.

<a id="d-093"></a>

### D-093 – Termíny a ceny jsou na veřejné stránce akce zatím vždy vidět

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-11-02 · **Rozhodl:** `pm`
- **Text:** Termíny a ceny na veřejné stránce akce se zatím zobrazují vždy, organizátor je nemůže skrýt. Další upřesnění se zeptáme PO (Q-NAS-15).
- **Dotčené US:** [US-122](https://github.com/applifting-vsecourse/team-1/issues/215)
- **Zdroj:** [ticket US-122 (#215), odpověď PM bod 2](https://github.com/applifting-vsecourse/team-1/issues/215#issuecomment-6581262940); [PR](https://github.com/applifting-vsecourse/team-1/pull/258#issuecomment-6582044173)
- **Dokumentace:** `docs/PROJEKT.md`: ceka, veřejná stránka akce: termíny a ceny vždy viditelné (dočasně)
- **Poznámka:** Dočasné, do odpovědi PO na Q-NAS-15.

<a id="d-094"></a>

### D-094 – Obsazenost a kapacita se veřejně nezveřejňují

- **Stav:** platné · **Typ:** produkt · **Oblast:** platforma
- **Datum:** 2026-11-02 · **Rozhodl:** `pm`
- **Text:** V katalogu akcí ani jinde veřejně se zatím nezobrazuje obsazenost ani kapacita (žádný pruh obsazenosti ani text „80 / 120 potvrzených“). Rámce ve Figmě, které je kreslí, se v tomto bodě neimplementují.
- **Dotčené US:** [US-123](https://github.com/applifting-vsecourse/team-1/issues/216)
- **Zdroj:** [ticket US-123 (#216), odpověď PM bod 1](https://github.com/applifting-vsecourse/team-1/issues/216#issuecomment-6585291926)
- **Dokumentace:** `docs/PROJEKT.md`: ceka, katalog akcí: obsazenost a kapacita nejsou veřejné
- **Poznámka:** Rozpor s Figmou katalogu (pruh obsazenosti); nahlásit designu.

<a id="d-095"></a>

### D-095 – Odkaz na katalog z landingu je samostatná story

- **Stav:** platné · **Typ:** produkt · **Oblast:** platforma
- **Datum:** 2026-11-02 · **Rozhodl:** `pm`
- **Text:** Z úvodní stránky musí vést odkaz na katalog akcí, ale nedělá se v US-123. Řeší samostatný ticket (#264); umístění a text určí design.
- **Dotčené US:** [US-123](https://github.com/applifting-vsecourse/team-1/issues/216)
- **Zdroj:** [ticket US-123 (#216), odpověď PM bod 2](https://github.com/applifting-vsecourse/team-1/issues/216#issuecomment-6585291926)
- **Poznámka:** Navazuje ticket #264.

<a id="d-096"></a>

### D-096 – Fotka veřejné stránky akce: jen JPG/JPEG a PNG

- **Stav:** platné · **Typ:** produkt · **Oblast:** nastavení akce
- **Datum:** 2026-11-02 · **Rozhodl:** `pm`
- **Text:** Fotografie na veřejné stránce akce smí být JPG/JPEG nebo PNG, WebP ne (podle Figmy).
- **Dotčené US:** [US-122](https://github.com/applifting-vsecourse/team-1/issues/215)
- **Zdroj:** [PR](https://github.com/applifting-vsecourse/team-1/pull/258#issuecomment-6582044173)
- **Dokumentace:** `docs/PROJEKT.md`: ceka, veřejná stránka akce: formát fotky JPG/JPEG a PNG
- **Poznámka:** Mění návrh v #215, který počítal i s WebP.

<a id="d-097"></a>

### D-097 – VS termínů na stránce po odeslání se nedoplňuje

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-11-02 · **Rozhodl:** `pm`
- **Text:** Stránka po odeslání přihlášky zobrazuje jen souhrnný variabilní symbol (a VS jednotlivých přihlášek), ne VS každého termínu. Doplnění vede enhancement #259.
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [PR](https://github.com/applifting-vsecourse/team-1/pull/257#issuecomment-6582343282)
- **Poznámka:** Navazuje ticket #259.

<a id="d-098"></a>

### D-098 – Jména v rámci se neskloňují

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-11-02 · **Rozhodl:** `pm`
- **Text:** Nemáme feature na skloňování jmen; nominativ („Přihláška pro Janu Novákovou“ zůstává bez skloňování) je správný stav a kód přihlášky zůstává ve tvaru LK-0048.
- **Dotčené US:** [US-137](https://github.com/applifting-vsecourse/team-1/issues/174)
- **Zdroj:** [PR](https://github.com/applifting-vsecourse/team-1/pull/257#issuecomment-6582343282)

<a id="d-099"></a>

### D-099 – Lhůta na zaplacení se nastavuje u akce; pozdní potvrzení je rovnou po splatnosti

- **Stav:** platné · **Typ:** produkt · **Oblast:** přihlašování na akce
- **Datum:** 2026-11-05 · **Rozhodl:** `pm`
- **Text:** Organizátor si u akce nastaví lhůtu na zaplacení; výchozí je 10 dní od potvrzení. Když se místo uvolní v okně „začátek termínu minus lhůta“ (např. týden před akcí při lhůtě 10 dní), potvrzená přihláška se rovnou označí jako po splatnosti, aby se urgovala platba. PO ověří (Q-PRI-02).
- **Dotčené US:** [US-31](https://github.com/applifting-vsecourse/team-1/issues/31)
- **Zdroj:** [rozhodnutí PM při přípravě statusu s PO 2026-11-05](https://github.com/applifting-vsecourse/team-1/issues/31)
- **Z otázek:** `Q-PRI-02`
- **Dokumentace:** `docs/PROJEKT.md`: ceka, lhůta na zaplacení jako nastavení akce; potvrzení v okně lhůty = po splatnosti
- **Poznámka:** Rozhodl PM; PO ověří (Q-PRI-02).

<a id="d-100"></a>

### D-100 – Oprava platby vrací zaplacenou přihlášku k dluhu

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-11-03 · **Rozhodl:** `pm`
- **Text:** Když organizátor opraví nebo odstraní platbu u potvrzené a zaplacené přihlášky v termínu a tím znovu vznikne dluh, přihláška se vrátí do stavu Potvrzená s dluhem (lhůta pro zaplacení běží znovu) a přihlašovatel automaticky dostane upozornění na opravu s aktuálním nedoplatkem a platebními údaji. Není to výzva po splatnosti. Když dluh nevznikne, e-mail neodchází.
- **Zdroj:** [Business katalog e-mailů, potvrzená rozhodnutí z dotazníku](../../docs/emaily/KATALOG.md)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (667c8d3), e-mail č. 16, přechod Potvrzená a zaplacená → Potvrzená s dluhem
- **Poznámka:** Rozhodl PM; PO ověří (Q-PRI-07). Storno podmínky samotné (Q-PRI-03, Q-PLA-04) zůstávají otevřené.

<a id="d-102"></a>

### D-102 – Výzva po splatnosti: jednou, automaticky nebo ručně podle organizátora

- **Stav:** platné · **Typ:** produkt · **Oblast:** platby
- **Datum:** 2026-11-03 · **Rozhodl:** `pm`
- **Text:** Výzva k zaplacení po uplynutí lhůty se posílá jednou a bez automatického opakování. Organizátor si v nastavení akce určí, zda se posílá automaticky, nebo ji posílá ručně.
- **Zdroj:** [Business katalog e-mailů, potvrzená rozhodnutí z dotazníku](../../docs/emaily/KATALOG.md)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (667c8d3), e-mail č. 7

<a id="d-103"></a>

### D-103 – Při zamítnutí nebo odhlášení zaplacené účasti e-mail refund neslibuje

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-11-03 · **Rozhodl:** `pm`
- **Text:** E-mail o zamítnutí nebo odhlášení již zaplacené účasti automatické vrácení peněz neslibuje; informace o případném vrácení platby sdělí organizátor. Při zrušení celého termínu zůstává informace, že se zaplacené platby vracejí (D-080).
- **Zdroj:** [Business katalog e-mailů, potvrzená rozhodnutí z dotazníku](../../docs/emaily/KATALOG.md)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (667c8d3), e-maily č. 9 až 11, 15

<a id="d-104"></a>

### D-104 – Změnové e-maily se týkají jen přihlášených a změněných termínů

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-11-03 · **Rozhodl:** `pm`
- **Text:** Změnový e-mail zahrnuje jen termíny, na které je účastník přihlášený a kterých se změna týká. Potvrzení odhlášení se posílá i pro termín, který účastník odhlášením odebral. Z toho neplyne další univerzální e-mail o libovolné úpravě přihlášky.
- **Zdroj:** [Business katalog e-mailů, potvrzená rozhodnutí z dotazníku](../../docs/emaily/KATALOG.md)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (667c8d3), pravidla e-mailů

<a id="d-105"></a>

### D-105 – Obecné ověření e-mailové adresy se nepožaduje

- **Stav:** platné · **Typ:** produkt · **Oblast:** účty
- **Datum:** 2026-11-03 · **Rozhodl:** `pm`
- **Text:** Účet vzniká odesláním přihlášky a potvrzovací e-mail obsahuje magic link (D-008); samostatné obecné ověření e-mailové adresy se neposílá. Netýká se potvrzení změny přihlašovací adresy.
- **Zdroj:** [Business katalog e-mailů, potvrzená rozhodnutí z dotazníku](../../docs/emaily/KATALOG.md)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: hotovo (667c8d3), e-mail č. 1, odkaz na přihlášení

<a id="d-106"></a>

### D-106 – Kontakty v patičce e-mailů podle druhu zprávy

- **Stav:** platné · **Typ:** produkt · **Oblast:** komunikace
- **Datum:** 2026-11-03 · **Rozhodl:** `pm`
- **Text:** Přihlášky, účast a platby řeší organizátor akce, přihlášení, heslo a zabezpečení účtu podpora Togeny. E-mail uvede příslušný kontakt a odpovědi na něj jdou stejnému příjemci. Školní projekt: skutečné kontakty se nedoplňují, používají se fiktivní adresy z docs/emaily/TEXTY.md.
- **Zdroj:** [Business katalog e-mailů, potvrzená rozhodnutí z dotazníku](../../docs/emaily/KATALOG.md)
- **Dokumentace:** `docs/emaily/TEXTY.md`: hotovo (667c8d3), společné části, patička
