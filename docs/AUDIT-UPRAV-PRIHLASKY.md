# Audit úprav přihlášky po odeslání

Podklad pro [#662](https://github.com/applifting-vsecourse/team-1/issues/662): které změny udělá po odeslání přihlášky přihlašovatel (za sebe i za účastníka) a zda stejného výsledku dosáhne organizátor. Ověřená verze aplikace je `1f4081f1` z `main` (28. 11. 2026). Audit vychází z obrazovek, API a testů v repozitáři, nepokrývá stav nasazení na stagingu. Otevřený [PR #776](https://github.com/applifting-vsecourse/team-1/pull/776) mění v Moje přihlášky cestu ke stravování a zdravotnímu omezení, v ověřené verzi ještě není.

Organizátor umí zapsat všechno, co přihlašovatel, protože používání aplikace není podmínkou účasti ([D-191](rozhodnuti/README.md#d-191)). Výjimkou je e-mail přihlášky ([D-196](rozhodnuti/README.md#d-196)). Mezery z první verze auditu (doprava, přání, pobyt, zdravotní omezení a časové hranice) uzavřely [#786–#790](https://github.com/applifting-vsecourse/team-1/pull/797).

**Shoda** znamená stejný výsledek v údajích přihlášky. Autor změny, historie, e-maily a upozornění se mohou lišit.

## Souhrn

| Č.  | Změna                                                | Stejný výsledek za organizátora                                    |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Údaje účastníka a individuální ubytování             | Shoda                                                              |
| 2   | Kontaktní e-mail přihlášky                           | Záměrný rozdíl: organizátor ho nemění                              |
| 3   | Stravování                                           | Shoda                                                              |
| 4   | První zápis zdravotního omezení nebo „bez omezení“   | Shoda, organizátor navíc potvrzuje souhlas                         |
| 5   | Vzít zpět potvrzené „Nemám žádné zdravotní omezení“  | Rozdíl: organizátor ho jen nahradí poznámkou ([O2](#rozhodnutí))   |
| 6   | Změna nebo smazání uložené zdravotní poznámky        | Záměrný rozdíl: organizátor schvaluje žádost                       |
| 7   | Doprava                                              | Shoda                                                              |
| 8   | Přání spolubydlení                                   | Shoda                                                              |
| 9   | Pozdější příjezd a dřívější odjezd                   | Shoda                                                              |
| 10  | Výměna termínu za jiný                               | Shoda ve výběru, stav nového termínu se záměrně liší               |
| 11  | Další termín                                         | Shoda: obě role jen novou přihláškou ([O3](#rozhodnutí))           |
| 12  | Návrat na zrušený termín                             | Shoda novou přihláškou, organizátor navíc výměnou v téže přihlášce |
| 13  | Odhláška z potvrzeného termínu nebo z celé přihlášky | Shoda                                                              |
| 14  | Odhláška z termínu bez potvrzené přihlášky v termínu | Mezera: někdy jde jen zrušení s jiným e-mailem ([O1](#rozhodnutí)) |
| 15  | Simulace platby (jen staging a demo)                 | Záměrný rozdíl: organizátor zapisuje ruční platbu                  |

## Kde se akce provádějí

- **Přihlašovatel:** **Moje přihlášky** → detail přihlášky. API pod `/api/participant/applications` vyžaduje účet přihlašovatele a vlastní přihlášku.
- **Organizátor:** **akce → Přihlášky** → detail přihlášky, případně jiná uvedená sekce akce. API pod `/api/organizer` vyžaduje účet organizátora a přístup k organizaci.

Zkratky v cestách API: `P` je `/api/participant/applications/:id`, `O` je `/api/organizer/applications/:applicationId`, `E` je `/api/organizer/events/:eventId`.

Hranice podle data se počítají v čase Europe/Prague a poslední den termínu se ještě počítá. „Dokud neskončil poslední termín“ znamená, že přihláška má aspoň jeden nezrušený termín, jehož poslední den ještě neuplynul. Odkaz **Upravit přihlášku** a sekce **Před akcí** v Moje přihlášky zmizí, až jsou všechny přihlášky v termínu Archivované (potvrzené, zaplacené a po konci termínu).

## Údaje přihlášky

### 1. Údaje účastníka a individuální ubytování

Jméno, příjmení, zájmena, datum narození, telefon, požadavek na individuální ubytování a jeho poznámka. Pohlaví nemění žádná role.

- **Přihlašovatel:** **Upravit přihlášku** → uložit (`PUT P/edit`). Dokud neskončil poslední termín, jinak server vrátí `APPLICATION_NOT_EDITABLE`. U přihlášky se všemi termíny zrušenými nebo skončenými, ale ne Archivovanými, se odkaz zobrazí a uložení odmítne až server.
- **Organizátor:** karta **Údaje účastníka** → tlačítko s tužkou **Upravit** (`PUT O/details`). Stejná pravidla včetně kontroly duplicity; tlačítko se zobrazí jen u upravitelné přihlášky.
- **Výsledek:** **Shoda.** Obě cesty zapisují historii. Upozornění organizátorům vzniká jen při úpravě přihlašovatelem, přihlašovateli e-mail nechodí.
- **Podklady:** [D-141](rozhodnuti/README.md#d-141), [D-167](rozhodnuti/README.md#d-167), [#515](https://github.com/applifting-vsecourse/team-1/issues/515), [#516](https://github.com/applifting-vsecourse/team-1/issues/516).

### 2. Kontaktní e-mail přihlášky

- **Přihlašovatel:** **Nastavení účtu** → změna přihlašovacího e-mailu. Po potvrzení odkazu na nové adrese se e-mail změní v účtu i ve všech jeho přihláškách, do potvrzení platí původní.
- **Organizátor:** nemění; dialog úpravy ho ukazuje jako **E-mail přihlášky (nelze měnit)**.
- **Výsledek:** **Záměrný rozdíl.** D-191 se na e-mail nevztahuje, protože e-mail je navázaný na účet přihlašovatele a mění ho jen on. Překlep v ručně přidané přihlášce organizátor řeší zrušením termínů a novým přidáním přihlášky.
- **Podklady:** [D-196](rozhodnuti/README.md#d-196), [D-128](rozhodnuti/README.md#d-128), [D-141](rozhodnuti/README.md#d-141).

### 3. Stravování

Varianty, alergie a další požadavky, speciální požadavek, potvrzení, že účastník žádné omezení nemá. Údaj platí pro celou přihlášku.

- **Přihlašovatel:** **Před akcí → Stravování** → **Uložit stravování** (`PUT P/meals`).
- **Organizátor:** karta stravování v detailu → tužka **Upravit stravování**, nebo **Stravování** v akci → zobrazení **Úprava stravování** → **Účastníci** (jen potvrzení ve vybraném termínu). Zápis jde přes `PUT E/meals/applications/:id`.
- **Podmínky obou rolí:** dokud neskončil poslední termín, na stavu přihlášky v termínu nezáleží. Pak se odkaz i tužka skryjí a server vrátí `MEALS_EDIT_CLOSED`.
- **Výsledek:** **Shoda.** Souhrn pro kuchyni počítá jen potvrzené.
- **Podklady:** [D-121](rozhodnuti/README.md#d-121), [D-202](rozhodnuti/README.md#d-202), [#659](https://github.com/applifting-vsecourse/team-1/issues/659), [#790](https://github.com/applifting-vsecourse/team-1/issues/790).

### 4. První zápis zdravotního omezení nebo „bez omezení“

- **Přihlašovatel:** **Před akcí → Zdravotní omezení** → poznámka s výslovným souhlasem, nebo **Nemám žádné zdravotní omezení** (`PUT P/health`).
- **Organizátor:** detail → **Zdravotní omezení** → **Zapsat za účastníka** → potvrdit „Potvrzuji, že mám od přihlašovatele výslovný souhlas…“ → **Uložit za účastníka** (`PUT O/health`). Souhlas potvrzuje i u volby bez omezení.
- **Podmínky obou rolí:** poznámka ještě není uložená a neskončil poslední nezrušený termín, jinak `HEALTH_CHANGE_REQUEST_REQUIRED` nebo `HEALTH_EDIT_CLOSED`.
- **Výsledek:** **Shoda.** Zápis organizátora je v historii jen jako zapsaný organizátorem, bez textu poznámky; upozornění nechodí.
- **Podklady:** [D-122](rozhodnuti/README.md#d-122), [D-191](rozhodnuti/README.md#d-191), [D-203](rozhodnuti/README.md#d-203), [D-220](rozhodnuti/README.md#d-220), [#789](https://github.com/applifting-vsecourse/team-1/issues/789).

### 5. Vzít zpět potvrzené „Nemám žádné zdravotní omezení“

- **Přihlašovatel:** na stránce zdravotního omezení zruší zaškrtnutí a uloží prázdný údaj. Stav se vrátí na nevyplněný. Jde to, dokud neskončil poslední termín.
- **Organizátor:** potvrzení může nahradit první poznámkou, ale vrátit na nevyplněný stav ho nemůže. Tlačítko uložení se bez poznámky neaktivuje a API vrátí `VALIDATION_FAILED`.
- **Výsledek:** **Rozdíl.** Dorovnat ho má [D-227](rozhodnuti/README.md#d-227), implementace [#868](https://github.com/applifting-vsecourse/team-1/issues/868) ([O2](#rozhodnutí)).

### 6. Změna nebo smazání uložené zdravotní poznámky

- **Přihlašovatel:** **Požádat o změnu** → **Odeslat žádost** (`POST P/health-change-requests`). Nová neprázdná poznámka vyžaduje souhlas. Dokud žádost čeká, další podat nejde. Žádost není časově omezená, ale u Archivované přihlášky k ní v Moje přihlášky nevede odkaz.
- **Organizátor:** **Přihlášky → Žádosti o změnu → Posoudit žádost** → schválit nebo zamítnout (`PATCH E/change-requests/:requestId/approve` nebo `reject`).
- **Výsledek:** **Záměrný rozdíl.** Změna uloženého zdravotního údaje vyžaduje žádost přihlašovatele a u nové poznámky jeho souhlas, proto ji přímo nemění ani jedna role. Platí to i pro poznámku, kterou za účastníka zapsal sám. Přímá úprava a vstup k žádosti z archivovaného detailu jsou mimo rozsah #789.
- **Podklady:** [D-122](rozhodnuti/README.md#d-122), [D-191](rozhodnuti/README.md#d-191), [#789](https://github.com/applifting-vsecourse/team-1/issues/789).

## Logistika

### 7. Doprava

- **Přihlašovatel:** **Co zbývá zařídit → Vybrat dopravu**, po výběru **Před akcí → Doprava**. Odkazy jsou u potvrzeného termínu s nabídkou dopravy, dokud termín neskončil (`PUT P/transport`).
- **Organizátor:** detail → **Doprava účastníka** → stejný dialog (`PUT O/transport`).
- **Podmínky obou rolí:** přihláška v termínu není Zrušená, doprava patří k termínu a termín neskončil (`TRANSPORT_EDIT_CLOSED`). Server neomezuje volbu na potvrzené termíny. Volbu bez náhrady odebrat nelze.
- **Výsledek:** **Shoda.** Zápis organizátora je v historii, přihlašovateli se nic neposílá.
- **Podklady:** [D-124](rozhodnuti/README.md#d-124), [D-202](rozhodnuti/README.md#d-202), [D-203](rozhodnuti/README.md#d-203), [#786](https://github.com/applifting-vsecourse/team-1/issues/786), [#790](https://github.com/applifting-vsecourse/team-1/issues/790).

### 8. Přání spolubydlení

Až tři jména, jejich úprava a smazání, **Nemám přání**.

- **Přihlašovatel:** karta **Přání spolubydlení** v detailu (`PUT P/terms/:termId/room-wishes`).
- **Organizátor:** detail → **Přání spolubydlení a pobyt** (`PUT O/terms/:termId/room-wishes`).
- **Podmínky obou rolí:** potvrzený nezrušený termín, bez individuálního ubytování, termín neskončil (`TERM_EDIT_CLOSED`). **Nemám přání** jen před zveřejněním pokojů a bez zadaných jmen.
- **Výsledek:** **Shoda.** Zápis organizátora je v historii bez upozornění.
- **Podklady:** [D-131](rozhodnuti/README.md#d-131), [D-191](rozhodnuti/README.md#d-191), [D-203](rozhodnuti/README.md#d-203), [D-220](rozhodnuti/README.md#d-220), [#787](https://github.com/applifting-vsecourse/team-1/issues/787).

### 9. Pozdější příjezd a dřívější odjezd

- **Přihlašovatel:** karta **Pozdější příjezd nebo dřívější odjezd** v detailu (`PUT P/terms/:termId/stay`).
- **Organizátor:** detail → **Přání spolubydlení a pobyt** (`PUT O/terms/:termId/stay`).
- **Podmínky obou rolí:** přihláška v termínu K vyhodnocení, potvrzená nebo Náhradník, termín není zrušený a neskončil. Čas je v rozsahu termínu a odjezd po příjezdu.
- **Výsledek:** **Shoda.** U potvrzených se údaj propíše do souhrnu pro kuchyni, cenu, kapacitu ani stav nemění.
- **Podklady:** [D-159](rozhodnuti/README.md#d-159), [D-191](rozhodnuti/README.md#d-191), [D-203](rozhodnuti/README.md#d-203), [D-220](rozhodnuti/README.md#d-220), [#485](https://github.com/applifting-vsecourse/team-1/issues/485), [#788](https://github.com/applifting-vsecourse/team-1/issues/788).

## Termíny a odhlášky

Přihlašovatel mění termíny okamžitě, dokud neběží schvalování požadavků účastníků. Od jeho data stejné dialogy vytvoří žádost o změnu; dokud čeká, jsou **Změnit termíny** i **Odhlásit se** neaktivní a přihlašovatel ji sám zrušit nemůže ([D-100](rozhodnuti/README.md#d-100), [D-107](rozhodnuti/README.md#d-107)). Organizátor mění přímo, nebo žádost posoudí v **Žádosti o změnu**. Schválená změna se vyhodnotí jako v automatickém režimu; do plného termínu schválit nejde a žádost zůstane otevřená, zastaralá žádost nic nepřepíše ([D-134](rozhodnuti/README.md#d-134), [proces žádosti o změnu](procesy/zpracovani-prihlasky/zadost-o-zmenu.md)). Platby se mezi termíny nepřevádějí ([D-088](rozhodnuti/README.md#d-088)).

| Přihláška v termínu       | Přihlašovatel: výměna a odhláška | Organizátor v detailu, karta **Stav v termínech**                                 |
| ------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| K vyhodnocení a Náhradník | Ano / ano                        | **Změnit termín**, **Změnit stav** (i na Zrušeno); **Odhlásit** jen podle bodu 14 |
| Potvrzená                 | Ano / ano                        | **Změnit termín**, **Odhlásit**; **Změnit stav** na Náhradníka jen při dluhu      |
| Zrušená                   | Ne / ne                          | Jen jako nový termín při výměně jiného (bod 12)                                   |
| Archivovaná               | Ne / ne                          | Žádná akce                                                                        |

### 10. Výměna termínu za jiný

- **Přihlašovatel:** **Změnit termíny** → **Původní termín** a **Nový termín** (`PUT P/terms`, po začátku schvalování `POST P/change-requests`). Nový termín je z téže akce, nezrušený, má pokoje a přihláška v něm dosud zrušená nebyla.
- **Organizátor:** **Změnit termín** u termínu → vybrat nový → **Potvrdit změnu termínu** (`PUT O/terms`).
- **Výsledek:** **Shoda ve výběru termínu.** Stav se záměrně liší: u přihlašovatele rozhodne režim (K vyhodnocení, nebo Potvrzená s dluhem či Náhradník podle volných lůžek), u organizátora jde o jeho rozhodnutí, takže nový termín je rovnou Potvrzená (s dluhem, dokud není zaplacená), nad kapacitu po vědomém potvrzení. Přihlašovatel dostane e-mail o změně.
- **Podklady:** [D-134](rozhodnuti/README.md#d-134), [D-158](rozhodnuti/README.md#d-158), [#33](https://github.com/applifting-vsecourse/team-1/issues/33), [#84](https://github.com/applifting-vsecourse/team-1/issues/84).

### 11. Další termín

- **V téže přihlášce:** UI nenabízí přidání termínu bez odebrání jiného ani jedné roli. API (`PUT P/terms`, `PUT O/terms`) širší výběr přijme. Stavové diagramy přidání termínu oběma rolím kreslí.
- **Přihlašovatel:** znovu odešle veřejnou přihlášku akce se stejným e-mailem a vybere další termín. Vznikne nová přihláška na stejném účtu.
- **Organizátor:** **Přihlášky → Přidat přihlášku** (`POST E/applications`). Potvrdí souhlas, u termínu zvolí Potvrzená s dluhem nebo Náhradník; skončený termín přidat nejde.
- **Výsledek:** **Shoda** v tom, co jde udělat z UI; stav se záměrně liší. Nová přihláška má vlastní kód a variabilní symbol. Stravování, zdravotní omezení, doprava, přání, pobyt ani platby se do ní nepřenášejí. Stejný účastník (jméno a datum narození) nemůže být na tomtéž termínu dvakrát (`APPLICATION_DUPLICATE`).
- **Podklady:** [D-012](rozhodnuti/README.md#d-012), [D-045](rozhodnuti/README.md#d-045), [D-153](rozhodnuti/README.md#d-153), [stavový diagram, ruční režim](procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.md), [automatický režim](procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.md), [O3](#rozhodnutí).

### 12. Návrat na zrušený termín

- **Přihlašovatel:** v téže přihlášce zrušený termín obnovit nemůže, výběr ho nenabízí. Může znovu odeslat veřejnou přihlášku na tento termín, vznikne nová přihláška (podmínky jako u bodu 11).
- **Organizátor, výměnou:** **Změnit termín** u jiného aktivního termínu → jako **Nový termín** vybrat zrušený. Vrátí se v téže přihlášce jako Potvrzená i se svými platbami a druhý termín se zruší. Termín akce nesmí být zrušený a musí mít pokoje.
- **Organizátor bez výměny:** pokud nemá přihláška žádný aktivní termín, karta **Stav v termínech** žádnou akci nenabízí a zbývá **Přidat přihlášku**. Obnovit termín bez odebrání jiného umí jen API.
- **Výsledek:** **Shoda** novou přihláškou, organizátor má navíc obnovení výměnou. Samostatné přidání a obnovení termínu organizátorem povoluje [D-228](rozhodnuti/README.md#d-228), implementace [#869](https://github.com/applifting-vsecourse/team-1/issues/869) ([O3](#rozhodnutí)).
- **Podklady:** [#33](https://github.com/applifting-vsecourse/team-1/issues/33), [slovník](SLOVNIK.md).

### 13. Odhláška z potvrzeného termínu nebo z celé přihlášky

- **Přihlašovatel:** **Odhlásit se** → celá přihláška, nebo jeden termín (`PUT P/terms`, případně žádost o změnu).
- **Organizátor:** **Odhlásit** u potvrzeného termínu, nebo **Odhlásit celou přihlášku** při dvou a více aktivních termínech (`POST O/terms/withdraw`). Před potvrzením vidí dopad na platby.
- **Výsledek:** **Shoda.** Termín je Zrušený, platby u něj zůstávají a vratka se sama neposílá. Při odhlášce organizátorem odejde jeden souhrnný e-mail o změně přihlášky.
- **Podklady:** [D-103](rozhodnuti/README.md#d-103), [D-127](rozhodnuti/README.md#d-127), [#32](https://github.com/applifting-vsecourse/team-1/issues/32), [#84](https://github.com/applifting-vsecourse/team-1/issues/84).

### 14. Odhláška z termínu bez potvrzené přihlášky v termínu

Týká se Náhradníka a stavu K vyhodnocení.

- **Přihlašovatel:** **Odhlásit se** u kteréhokoli z nich. Při odhlášce jednoho termínu dostane e-mail **Odhlášení potvrzeno**.
- **Organizátor:** odhlášku zadá, jen když má přihláška i potvrzený termín (v dialogu **Odhlásit** zvolí v poli **Rozsah odhlášení** jiný termín), nebo když ruší všechny aktivní termíny najednou (**Odhlásit celou přihlášku**, aspoň dva). Jinak, hlavně u přihlášky s jediným termínem, zbývá jen **Změnit stav → Zrušeno**.
- **Rozdíl při zrušení:** údaje dopadnou stejně, ale přihlašovatel dostane u Náhradníka e-mail **Přihláška zrušena organizátorem** a u K vyhodnocení **Přihláška zamítnuta**. Odhláška by poslala e-mail o změně přihlášky. API `POST O/terms/withdraw` ji pro tyto stavy přijme.
- **Výsledek:** **Mezera.** Stavové diagramy u Náhradníka vedou odhlášku zadanou organizátorem i zrušení náhradníka organizátorem jako dvě různé události a D-127 s odhláškou náhradníka počítá. Odhlášku u obou stavů zavádí [D-226](rozhodnuti/README.md#d-226) (stavový diagram ji má i u K vyhodnocení), implementace [#867](https://github.com/applifting-vsecourse/team-1/issues/867) ([O1](#rozhodnutí)). Současná podoba vznikla v [PR #473](https://github.com/applifting-vsecourse/team-1/pull/473), kde se náhradník ruší změnou stavu.
- **Podklady:** [D-057](rozhodnuti/README.md#d-057), [D-127](rozhodnuti/README.md#d-127), [katalog e-mailů](emaily/KATALOG.md), [stavový diagram](procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.md).

## Platby

### 15. Simulace platby

- **Přihlašovatel:** **Co zbývá zařídit → Zaplatil jsem**, jen na stagingu a demu a jen při dluhu potvrzeného termínu (`POST P/payments/simulation`). Platební údaje a QR kód samy nic nezapisují.
- **Organizátor:** detail → **Zapsat platbu k termínu** nebo **Zapsat platbu** (`POST O/payments`).
- **Výsledek:** **Záměrný rozdíl** v původu platby, dopad na dluh je stejný. Simulace není součást produktu.
- **Podklady:** [D-135](rozhodnuti/README.md#d-135), [US-115](https://github.com/applifting-vsecourse/team-1/issues/208), [US-44](https://github.com/applifting-vsecourse/team-1/issues/44).

Mimo audit jsou čtecí obrazovky (program, platební údaje, přidělený pokoj, nástěnka), označení upozornění nebo příspěvku za přečtené a nastavení účtu bez dopadu na údaje přihlášky (heslo, jazyk). Změna e-mailu účtu je v bodě 2.

## Rozhodnutí

Otázky z auditu, na které 28. 11. 2026 odpověděl product manager ([odpovědi](https://github.com/applifting-vsecourse/team-1/pull/782#issuecomment-7242168026)).

| Č.  | Otázka                                                                                      | Rozhodnutí                               | Ticket                                                            |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| O1  | Odhláška zadaná organizátorem u Náhradníka a K vyhodnocení bez potvrzeného termínu (bod 14) | Ano, [D-226](rozhodnuti/README.md#d-226) | [#867](https://github.com/applifting-vsecourse/team-1/issues/867) |
| O2  | Vzít zpět potvrzení „Nemám žádné zdravotní omezení“ organizátorem (bod 5)                   | Ano, [D-227](rozhodnuti/README.md#d-227) | [#868](https://github.com/applifting-vsecourse/team-1/issues/868) |
| O3  | Přidání termínu a obnovení zrušeného v téže přihlášce organizátorem (body 11 a 12)          | Ano, [D-228](rozhodnuti/README.md#d-228) | [#869](https://github.com/applifting-vsecourse/team-1/issues/869) |

Původní otázku O4 uzavřelo [D-220](rozhodnuti/README.md#d-220). U obou rolí lze přání a příjezd či odjezd zapsat do konce příslušného termínu, první zdravotní omezení do konce posledního nezrušeného termínu. O změnu uložené zdravotní poznámky může přihlašovatel požádat i později podle [D-122](rozhodnuti/README.md#d-122).

## Navazující práce

Hotovo v [PR #797](https://github.com/applifting-vsecourse/team-1/pull/797) (27. 11. 2026):

| Ticket                                                            | Co přibylo                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [#786](https://github.com/applifting-vsecourse/team-1/issues/786) | Organizátor volí dopravu účastníka.                                                              |
| [#787](https://github.com/applifting-vsecourse/team-1/issues/787) | Organizátor zapisuje přání spolubydlení.                                                         |
| [#788](https://github.com/applifting-vsecourse/team-1/issues/788) | Organizátor zapisuje pozdější příjezd a dřívější odjezd.                                         |
| [#789](https://github.com/applifting-vsecourse/team-1/issues/789) | Organizátor poprvé zapíše zdravotní omezení po potvrzení souhlasu.                               |
| [#790](https://github.com/applifting-vsecourse/team-1/issues/790) | Doprava a stravování mají pro obě role hranici podle data ([D-202](rozhodnuti/README.md#d-202)). |

Navazující tikety založené 28. 11. 2026:

| Ticket                                                                                                           | Scénář                                                                                             | Očekávané chování                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#867](https://github.com/applifting-vsecourse/team-1/issues/867): Odhláška bez potvrzeného termínu (mezera, O1) | Náhradník s jediným termínem zavolá organizátorovi, že se odhlašuje.                               | Organizátor zvolí **Odhlásit**, přihláška v termínu je Zrušená a přihlašovatel dostane e-mail o změně přihlášky, ne o zrušení organizátorem. Podle O1 totéž pro K vyhodnocení. |
| [#868](https://github.com/applifting-vsecourse/team-1/issues/868): Vrácení „bez omezení“ (O2)                    | Organizátor omylem uloží za účastníka „Nemám žádné zdravotní omezení“.                             | Organizátor údaj vrátí na nevyplněný, historie zaznamená, kdo to udělal.                                                                                                       |
| [#869](https://github.com/applifting-vsecourse/team-1/issues/869): Přidání a obnovení termínu (O3)               | Účastník se ozve, že chce i druhý termín, nebo se vrací na zrušený, a v přihlášce nemá co vyměnit. | Organizátor v detailu přidá termín bez odebrání jiného; stav a kapacita se řídí [D-134](rozhodnuti/README.md#d-134), platby zrušeného termínu zůstanou u něj.                  |

Nález mimo porovnání rolí: [D-137](rozhodnuti/README.md#d-137) nedovoluje přihlašovateli přidat nebo změnit termín od jeho prvního dne a organizátorovi po jeho posledním dni. Veřejné odeslání ani výměna termínu to nekontrolují, obě role dnes vymění termín i za skončený. Ruční přidání přihlášky organizátorem skončený termín odmítne. Ticket [#486](https://github.com/applifting-vsecourse/team-1/issues/486) kryje veřejné podání a změnu přihlašovatelem a od 28. 11. 2026 i organizátora: výměna termínu po posledním dni termínu skončí chybou a skončený termín se ve výběru nenabídne.

## Ověření

Integrační testy proti sestavenému serveru pokrývají zápis, podmínky a přístup:

| Body   | Testy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, 2   | [vlastní úprava](../apps/backend/src/modules/participants/application-edit.int-spec.ts), [úprava organizátorem](../apps/backend/src/modules/participants/organizer-application-edit.int-spec.ts), [změna e-mailu](../apps/backend/src/modules/account/email-change.int-spec.ts)                                                                                                                                                                                                                                                                                                     |
| 3–6    | [stravování](../apps/backend/src/modules/meals/meals.int-spec.ts), [zdravotní omezení a žádost](../apps/backend/src/modules/health/health.int-spec.ts)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 4, 7–9 | [zápis organizátora za účastníka](../apps/backend/src/modules/participants/organizer-on-behalf.int-spec.ts), [doprava](../apps/backend/src/modules/transport/transport.int-spec.ts), [přání](../apps/backend/src/modules/participants/room-wishes.int-spec.ts), [pobyt](../apps/backend/src/modules/participants/stay.int-spec.ts), [hranice podle data](../apps/backend/src/modules/applications/domain/edit-window.spec.ts)                                                                                                                                                       |
| 10–14  | [změna přihlašovatelem](../apps/backend/src/modules/applications/participant-term-change.int-spec.ts), [změna a obnovení organizátorem](../apps/backend/src/modules/applications/organizer-term-change.int-spec.ts), [odhláška organizátorem](../apps/backend/src/modules/applications/organizer-withdrawal.int-spec.ts), [změna stavu](../apps/backend/src/modules/applications/term-status.int-spec.ts), [žádosti](../apps/backend/src/modules/applications/change-request.int-spec.ts), [ruční přidání](../apps/backend/src/modules/applications/manual-application.int-spec.ts) |
| 15     | [simulace](../apps/backend/src/modules/participants/my-applications.int-spec.ts), [ruční platba](../apps/e2e/tests/payments.spec.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Soupis akcí vychází ze všech zapisovacích endpointů dostupných přihlašovateli (účet, veřejná přihláška, `/api/participant/…`, upozornění a nástěnka). Cesty v UI a podmínky zobrazení vycházejí z komponent v [`features`](../apps/frontend/src/features/). Chování, které žádný uložený test nedokládá (body 5, 11, 12 a 14 a nález k D-137), ověřil 28. 11. 2026 jednorázový scénář proti sestavenému serveru, který není součástí repozitáře: vrácení „bez omezení“ organizátorem skončilo chybou 400, opětovné veřejné odeslání s jiným i se zrušeným termínem založilo novou přihlášku, zrušení stavu poslalo uvedené e-maily, odhláška přes API prošla a obě role vyměnily termín za skončený.
