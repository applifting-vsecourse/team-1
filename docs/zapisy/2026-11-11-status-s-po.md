# Status s PO (11. 11. 2026)

Status s Product Ownerem (Tomáš Kříž): zpětná vazba k demu, organizace práce, priority pro Sprint 4, upřesnění požadavků PO a jeho zadání v plném znění.

## Demo a zpětná vazba

- Demo nového designu je veřejně dostupné na internetu, není pouze lokální.
- Tomáš tento týden prokliká aktuální aplikaci a pošle další zpětnou vazbu.
- Pro asynchronní zpětnou vazbu lze vedle krátkých komentovaných nahrávek využít také screenshoty z PR, které dělá agent automaticky.

## Komunikace a organizace práce

- V GitHubu přibyl sloupec s prioritou v rámci sprintu, aby bylo jasnější pořadí práce a průběžně se sledovalo, co tým stíhá.
- Tomášovi se občas odhlásí Teams. Pokud tým potřebuje jeho reakci, má ho přímo označit nebo se připomenout.
- Lépe evidovat návaznosti mezi tickety. Dlouho otevřený PR zablokoval další dva úkoly; pokud blokující práci nelze dokončit, mají se brát krátké neblokující tickety. Za evidenci je odpovědný Adam (PM).

## Aktualizované termíny a další kroky

- **Aktualizovaný termín refinementu:** **úterý 17. 11. od 9:00 do 10:00**. Pozvánka byla vytvořena.
- Průběžný feedback k aktuálním funkcím proběhne asynchronně; refinement se zaměří na backlog a budoucí směr aplikace.
- Schůzka plánovaná na následující den v 16:00 se ruší a retro proběhne asynchronně.
- Lépe provázat blokující se tickety v GitHubu.
- Dokončit plán aktuálního sprintu a oznámit ho týmu.
- Napsat Péťovi, aby se věnoval bugům, a potvrdit v chatu čtvrteční call ve 20:00.
- Ve čtvrtek ve 20:00 Honza ukáže týmu nastavení AI agentů a efektivní delegování práce.

---

## Priority pro Sprint 4

1. Dotáhnout nový **design** aplikace.
2. Dodat modul **ubytování** – přiřazování lidí do pokojů, spolubydlení a individuální požadavky.
3. Umožnit hromadný **import** a párování plateb z CSV.
4. Zlepšit **účastnický pohled**, aby měl uživatel důvod se vracet – například kvůli ubytování a požadavkům na spolubydlení.

---

## Upřesnění požadavků

Níže je rozpracování požadavků z pohledu PO včetně explicitních odpovědí na otevřené otázky. Těžiště sprintu je v ubytování; platby a účastnická část na něj mají navazovat.

### 1. Nový design aplikace

- **Cíl:** převést nový vizuální směr do reálné aplikace a dotáhnout ho, ne pouze udržovat samostatné demo.
- Tmavší navigace má zvýšit kontrast. Motiv rohů převzatý ze značky je za PO v pořádku a dává produktu vlastní charakter; zbývá hlavně konzistentní použití a drobné doladění.
- Tečku v levém sloupci odstranit nebo znovu promyslet její použití napříč aplikací — PO ji v aktuálním provedení vnímá jako rušivou.
- Animace a drag & drop jsou žádoucí, ale před demem je potřeba ověřit jejich plynulost a barvy na projektoru. Obsahové návrhy nových obrazovek průběžně ukazovat PO ještě před implementací.

### 2. Ubytování — pohled organizátora

- **Hlavní výstup:** přehled pokojů a konkrétních lůžek, ve kterém organizátor vidí obsazenost, volná místa a lidi bez pokoje.
- Účastníky lze přiřazovat na lůžka a přesouvat mezi pokoji pomocí drag & drop. Rozhraní má podporovat rychlé ruční „šoupání“ s lidmi při optimalizaci kapacity.
- Systém hlídá kapacitu, pohlaví, přistýlky a další omezení. Porušení pravidla zobrazí jako varování, ale organizátora nezablokuje — finální rozhodnutí zůstává na něm.
- Musí jít vytvořit smíšené, partnerské a rodinné pokoje včetně rodin s dětmi. Tyto výjimky se nesmí „prát“ s automatickým vyhodnocením.
- U každého přání na spolubydlení má organizátor vidět, zda bylo splněno. Informace se sbírá od potvrzených účastníků.
- Po odhlášení účastníka se okamžitě ukáže volné lůžko a vhodní náhradníci, kteří se do něj vejdou s ohledem na pravidla pokoje.
- Rozdělení do pokojů je volitelné. Některé akce ho provedou až na místě, takže zveřejnění ani kompletní rozdělení nesmí být povinnou podmínkou běhu akce.
- Počítat s pozdějším příjezdem a dřívějším odjezdem. Organizátor potřebuje pro každý den vědět, kolik lidí je přítomných, kolik jich spí a kolik se jich stravuje.

#### 2.1 Feature rezervace pokojů před spuštěním přihlášek

> **Ano, tento use case existuje, ale konkrétní řešení nechává PO na týmu.** Organizátor někdy zná opakující se páry, rodiny nebo jiná omezení předem a ideálně si některé pokoje či konkrétní osoby připraví ještě před otevřením přihlášek. Funkce však nesmí rozbít současný algoritmus. Pro sprint je přijatelné také zařazení těchto lidí během ručního vyhodnocení, pokud vznikne jednoduchý a dobře demonstrovatelný scénář.

#### 2.2 Feature přiřazení na lůžko ve stavu „K vyhodnocení“ (nedotazováno, vyplynulo z diskuze)

> **Ano.** Z diskuse vyplývá, že organizátor má mít možnost pracovat s individuálním ubytováním už před finálním potvrzením nebo během ručního vyhodnocování. Stav přihlášky tedy nemá technicky bránit dočasnému přiřazení na lůžko; potvrzení účasti a zveřejnění pokoje účastníkovi jsou samostatné kroky.

### 3. Hromadné vyhodnocení přihlášek a náhradníci

- **Problém popsaný PO:** organizátor označil 20 přihlášených při kapacitě 10. Systém správně potvrdil 10, ale se zbývajícími 10 už nic neudělal.
- **Požadované chování:** při jedné hromadné akci nabídnout potvrzení lidí, kteří se vejdou, a současně označení ostatních jako náhradníků.
- **Minimální alternativa:** po akci musí jít snadno vyfiltrovat pouze nepotvrzené účastníky, všechny je označit a provést nad nimi hromadnou změnu stavu na náhradníky.

> **Vysvětlení k otázce „Nerozumím“:** nejde o změnu algoritmu, který vybírá lidi do kapacity. Jde o dokončení workflow — z jedné vyhodnocované skupiny mají vzniknout dvě jasné skupiny: potvrzení a náhradníci, bez ručního dohledávání zbytku.

### 4. Účastnická část a důvod k návratu

- **Cíl:** po odeslání přihlášky nemá být aplikace „mrtvá“. Účastník se do ní vrací kvůli aktuálním informacím a úkonům před akcí.
- Po potvrzení účasti zadá, s kým chce bydlet. Po zveřejnění rozdělení vidí svůj pokoj a relevantní spolubydlící.
- Vidí stav platby — potvrzení, že platba dorazila, nebo informaci, co ještě chybí.
- Může aktualizovat způsob dopravy a čas příjezdu či odjezdu; změna se okamžitě propíše organizátorovi.
- Účastnická část má být přívětivá především na mobilu a měla by nabídnout jednoduchý přehled kroků po registraci.

#### 4.1 Viditelnost účastníků

> **PO preferuje spíše optimistický přístup uvnitř uzavřené skupiny potvrzených účastníků.** Po potvrzení jsou lidé součástí komunity dané akce, mohou se navzájem vidět a domlouvat se. Seznam nemá být veřejný ani dostupný náhodným návštěvníkům. Současně musí organizátor umět vzájemnou viditelnost pro jiný typ akce úplně vypnout. Přesný rozsah zobrazovaných údajů a způsob souhlasu je ještě potřeba doplnit.

### 5. Platby

- **Cíl:** organizátor nahraje bankovní výpis a systém hromadně rozpozná, kteří účastníci zaplatili.
- Pro sprint stačí CSV z jedné banky, například Fio, případně jednoduchý generický formát. Není požadováno zkoumat a podporovat formáty všech českých bank.
- Jednoznačné platby se spárují automaticky. Nespárované položky organizátor vyřeší ručně a u každé vidí důvod, proč automatické spárování selhalo.
- Výsledkem importu je přehled nově uhrazených přihlášek a aktualizovaný stav platby pro organizátora i účastníka.
- Přímé online propojení s bankou je cílová představa do budoucna, nikoli požadavek tohoto sprintu.

### 6. Nejčastější dotazy a provozní potřeby organizátora

#### Před akcí

- **Ubytování:** s kým chce účastník bydlet, zda jde o pár či rodinu, jak využít každé lůžko a kam umístit speciální kombinace.
- **Doprava:** kdo jede autobusem, kdo vlastní dopravou a kdo změnil plán krátce před akcí.
- **Příjezdy a odjezdy:** kdo přijede později nebo odjede dříve a jak se tím mění denní obsazenost.

#### Během akce

- **Stravování:** počty běžných, vegetariánských, bezlepkových a dalších jídel podle aktuálně přítomných lidí.
- **Denní stavy:** kolik lidí je v konkrétní den na místě, kolik jich spí a kolik se jich stravuje. Počty se v průběhu vícedenní akce mění. Někdo přijede později a někdo odjede dříve.

> **Explicitní odpověď:** nejčastější komunikace před akcí se týká ubytování, dopravy a změn příjezdu či odjezdu. Během akce jsou klíčové stravovací požadavky a přesné denní počty přítomných, ubytovaných a stravovaných osob.

### 7. Očekávání PO k procesu

- Nové obrazovky a zamýšlené workflow ukázat PO ještě před stavbou — formou wireframu, návrhu v designu nebo krátkého průchodu.
- Pro průběžný feedback preferuje PO krátké komentované screen recordingy před dlouhými textovými souhrny.
- Refinement má řešit zbývající backlog a směr aplikace. Tým má vedle zadaných bodů přinést i vlastní návrh přidané hodnoty pro poslední vývojové sprinty.

## Zadání od PO v plném znění

Dotáhnout rozdělané věci a přidat následující:

### Organizátor

- **Hlavní cíl: rozdělení do konkrétních pokojů.** Interaktivní a hezké, lidi mezi pokoji přetahuju (drag & drop). Vidím, kdo kde spí a kde je ještě místo.
- Když porušuju pravidlo (pohlaví, kapacita, přistýlka), aplikace mě upozorní, ale nezastaví.
- **Vyřeším individuální ubytování**: partnerský pokoj, rodinu s dětmi. Jsou to vlastně smíšené pokoje a někde v procesu musí jít vytvořit, aniž by se to pralo s vaším vyhodnocením. Já osobně bych si je nejradši připravil ještě před vyhodnocením, ale klidně nejdřív vyhodnoťte a pak lidi přiřazujte do pokojů. Na demu to bude vypadat líp a obecně se to hodí víc akcím.
- Vidím přání spolubydlících a jestli jsem je splnil.
- Když se někdo odhlásí, vidím volné lůžko a kdo z náhradníků se do něj vejde.
- Rozdělení není povinné. Jsou akce, kde se pokoje rozdělují až na místě.
- **Platby za akci zpracuju hromadně.** Nahraju výpis z účtu (CSV z Fio) a platby se spárují samy. Co se spárovat nedá, vyřeším ručně a vidím proč.

### Účastník

- **Hlavní cíl: mám důvod do aplikace chodit a rád ji používám.** Vymyslete, proč se vracím i po odeslání přihlášky, a udělejte to přívětivé, hlavně na mobilu.
- Když mám potvrzenou účast, napíšu, s kým chci bydlet.
- Pokud organizátor rozdělení zveřejní, vidím svůj pokoj.
- Dozvím se, že mi dorazila platba, nebo že ještě něco chybí.

### Tým

- **Refinement v pondělí 16. 11.** Přijďte s dotazy k aplikaci a s návrhem, jak vyřešíte rozdělení do pokojů, účastnickou část a párování plateb. Ukažte mi to dřív, než to postavíte.
