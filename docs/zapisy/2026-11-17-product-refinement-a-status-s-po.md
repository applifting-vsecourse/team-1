# Product refinement a status s PO (17. 11. 2026)

## 3 features

### Rozdělení do pokojů

#### Co je hotovo

- Nepřiřazení → drag 'n' drop → pokoj

- Vč. všech termínů

- Hlídání pravidel, varování, souhrn porušení pravidel

- Přehled ubytování

- Individuální ubytování

#### Co bude hotovo

##### Features

- Spolubydlící, přání spolubydlících

- Zveřeňování pokojů - zpětná vazba uživateli

##### Úpravy

- UX péče

  - dlouhý seznam pokojů v dialogu přiřazení

  - lišta souhrnu porušení

  - ux refinement zaměřený na gender-citlivé osoby

- Defaultní uvažování přes všechny termíny

  - Přiřazení úč. do pokoje

  - Vytvoření přistýlky

- Ovládání z vícero pohledů

#### Strategie

- Asistované rozdělování do pokojů

  - Systém zohlední pohlaví, individuální požadavky, rodinny, páry a přání na spolubydlící a navrhe optimální variantu

- Podpora day-to-day operativy

  - Denní počty přítomných, ubytovaných, příjezdy, odjezdy, mimořádnosti

#### Vyjádření PO

- Asistované rozdělování je užitečné; musí navazovat na potvrzování účasti a respektovat dostupná lůžka.

- Výstup má být upravitelný návrh. Přijatelný je i částečný výsledek, např. 80 ze 100 lidí rozdělit automaticky a zbytek doladit ručně.

---

### Účastnická část

#### Co je hotovo

- Moje přihláška: stav přihlášky v termínech, platební údaje a QR

- Přístup přes magic link, heslo, profil (jazyk, heslo, e-mail)

- Úprava údajů, změna termínu a odhláška přihlašovatelem

- Doprava, stravovací omezení a zdravotní údaje za účastníka

- Harmonogram a program akce na mobilu ([US-66](https://github.com/applifting-vsecourse/team-1/issues/66))

- Upozornění v aplikaci a e-maily o změnách

#### Co bude hotovo

##### Features

- Přehled kroků po registraci: co mám před akcí udělat a co už mám hotové ([US-149](https://github.com/applifting-vsecourse/team-1/issues/149), Ready)

- PO: Položka checklistu má vést přímo na místo, kde účastník údaj doplní nebo úkon provede, např. na volbu dopravy.

- Pozdější příjezd, dřívější odjezd ([US-143](https://github.com/applifting-vsecourse/team-1/issues/143), Backlog)

- Nástěnka s informacemi k akci ([US-91](https://github.com/applifting-vsecourse/team-1/issues/91), Backlog)

- Spolubydlící a pokoj: viz část Ubytování

##### Úpravy

- Pořadí náhradníka v detailu přihlášky ([#364](https://github.com/applifting-vsecourse/team-1/issues/364), In Test)

- Magic link chybí v potvrzovacím e-mailu ([#178](https://github.com/applifting-vsecourse/team-1/issues/178), Ready)

- Formulář přihlášky: skok na první chybné pole ([#529](https://github.com/applifting-vsecourse/team-1/issues/529), Ready)

- Zájmena v přihlášce ([#516](https://github.com/applifting-vsecourse/team-1/issues/516), Backlog)

#### Strategie

- Účastník jako aktivní uživatel

  - Aplikace není „mrtvá“ po odeslání přihlášky.

  - Je to místo, kde účastník před akcí vidí, co má udělat, co se děje s jeho pokojem a platbou a co mu organizátor sdělil.

- Komunita potvrzených účastníků

  - Seznamování a chat ([US-92](https://github.com/applifting-vsecourse/team-1/issues/92), Nice to have, ve Sprintu 4 jako Backlog).

- Komunikace organizátor ↔ účastníci

  - Hromadné zprávy ([US-57](https://github.com/applifting-vsecourse/team-1/issues/57)) a odpovědi v systému ([US-58](https://github.com/applifting-vsecourse/team-1/issues/58)), obě Nice to have.

#### Vyjádření PO a diskuse

- Účastnická část má působit jako samostatná aplikace s vlastním menu; bez navigace pro organizátory a katalogu akcí.

- Detail akce potřebuje rozcestník nebo submenu, aby s přibývajícími moduly nevznikala jedna dlouhá stránka.

- Honza upozornil na opakované rozbalování menu na mobilu a navrhl zachovat shodnou informační architekturu s organizátorskou částí.

---

### Párování plateb

#### Co je hotovo

- Platební údaje s variabilním symbolem a QR, zápis plateb a vratek, přehled plateb a dluhů

- Storno podmínky a schvalování změn

- Potvrzení platby e-mailem, simulace platby na stagingu

#### Co bude hotovo

##### Features

- Nahrání bankovního výpisu a spárování plateb (US-42, v code review)

- Párování souhrnného variabilního symbolu (US-148, Backlog)

##### Úpravy

- Platební údaje a QR v Moje přihláška (#311, In Test)

- Sjednocení souhrnného dluhu v seznamu přihlášek (#362)

- Lhůta na zaplacení (#500, #501, Nice to have)

#### Strategie

- Od ručního zápisu k hromadnému párování z výpisu

- Aktivní práce s dluhem: výzvy k zaplacení a přehled nevrácených přeplatků

#### Vyjádření PO a upřesnění

- Na frontendu účastník uvidí souhrn: celkovou částku, zaplaceno, zbývající dluh a QR kód u součtu. Backendové členění a VS po termínech zůstávají; využijí je i akce se samostatnými víkendovými workshopy.

- Počítat s částečnými platbami pod stejným VS; přijatá platba a zbývající doplatek musí být rychle čitelné.

- Import výpisů: prioritou je Fio, univerzálnější formát má nízkou prioritu. Přímé API banky je až budoucí směr.

- Do dalšího rozvoje patří automatické výzvy, logování práce s dluhem, vyřazení po lhůtě a přehled nevrácených přeplatků.

---

## Dlouhodobý plán produktu

### Porovnání s Lean Canvasem

Posun od 12.10.

#### Optimalizace obsazenosti

**↗**

Dobrý směr, platforma pokrývá mnoho procesů řešení přihlášek a usnadnění naplnění kapacity.

#### Jednotné finanční řízení

**−**

Zatím pouze mechanika plateb.

#### Jednotné pracovní prostředí

**↗**

Platforma již nyní nabízí mnoho funkcí, které eliminují původní nástroje (tabulky, maily) a spoustu dalších funkcí je backlogu.

---

### Iniciativy

#### Opakovatelnost

Jednotné pracovní prostředí | Optimalizace obsazenosti

**Zaměření na to, aby se mohly snadno opakovat akce**

- Kopírování akcí

- Udržování kontaktu s účastníky mezi akcemi

- Předvyplňování

#### Doplnění z diskuse

- Další možnosti: early bird slevy a benefity za doporučení.

- Iniciativu rozpadnout na malé realizovatelné tickety, např. kopírování akce jedním tlačítkem.

#### Komunita

Optimalizace obsazenosti | Jednotné pracovní prostředí

**Místo aby zakládali Facebook nebo Whatsapp skupinu zůstanou na platformě**

- Udržení vztahů mezi akcemi

- Tvorba nových komunit a nových akcí

#### Doplnění z diskuse

- Navázat na nástěnku; komunikační prostor může zůstat užitečný i po skončení akce.

- Rozvoj komunity je druhou prioritou sprintu 5.

#### Finance

Jednotné finanční řízení | Jednotné pracovní prostředí

**Hig level pohled na finanční řízení akce**

- Přidání features na nákladové stránce

- Rozpočet akce

- _Vyplatí se akce_?

- Scénáře _co kdyby?_

#### Vyjádření PO a rozsah k rozpracování

- Ekonomický modul je hlavní cíl sprintu 5. Doplnit nákladovou stránku, aby finanční řízení nezůstalo jen u plateb.

- Zahrnout fixní náklady, např. areál a dopravu, rozpočítání na účastníky, mzdy lektorů i variabilní náklady před akcí a během ní.

- U variabilních nákladů uvažovat výpočet jednotková cena × počet účastníků i zápis skutečného výdaje podle účtenky.

- Modul navrhnout obecně pro různé organizátory.

---

### Sekundární iniciativy

- Podpora akcí bez ubytování - nabídka platformy dosud neobsluhovaného segmentu

- V diskusi zazněly např. jóga a keramika. Pro tyto akce posoudit přínos plateb, programu, stravování, dokumentů a ekonomiky; využití lze ukázat i v prezentaci.

---

### Priority a plán sprintu 5

- Sprint 4 končí příští týden; sprint 5 končí 7. prosince. Před středečním planningem tým připraví návrh ekonomického modulu a plán sprintu.

- PO doporučil vedle drobných zlepšení přidávat i viditelné moduly, např. program a stravování, aby aplikace sloužila také během akce a její posun byl čitelný na demu.

---

## Demo a produktový status

### Ukázané funkce a zpětná vazba

- Automatické zaplnění uvolněného lůžka náhradníkem je nasazené.

- První verze programu má kalendářový pohled, bloky s názvem, místem a popisem a varování při překryvu. V plánu je sjednocení programu přes termíny.

- Přiřazování do pokojů při porušení pravidel varuje, umožňuje doplnit poznámku a potvrdit výjimku. Přistýlky lze snadno přidat.

- Dlouhé poznámky zvětšují tabulku ubytování; zkrátit jejich zobrazení na ikonu, štítek nebo tooltip.

- Běžný scénář pro optimalizaci je přibližně 100 lidí a 20 pokojů. Pro stresový test zaznělo 100 termínů, 1000 účastníků a dlouhá jména.

- Tisknutelný export ubytování pomůže při check-inu. Individuální potřeby queer osob v něm nejsou viditelné.

- PO považuje ubytovací modul za dobře prezentovatelný na demu.

### Provoz a další ověření

- E-maily jsou zatím omezené na jednu adresu kvůli nastavení Resend bez vlastní domény; rozšíření není prioritou. Zmíněno bylo také Brevo.

- Připravovaný design má rozhraní zpřehlednit a zkompaktnit.

- Další demo bude ve čtvrtek 19. 11., feedback PO v pátek.

- Datum lednových závěrečných prezentací není známé. Honza upozornil na kolizi se státnicemi a riziko přetížení novými netestovanými funkcemi přes Vánoce.

### Týmová operativa

- Diskuse o daily směřovala k informacím o dostupnosti a překážkách pro plánování; podrobné vypisování vykonané práce tým nepovažuje za užitečné.

## Další kroky

- (Adam Hanuš) Sepsat demo hotových funkcí, aby si je Tomáš Kříž mohl proklikat

- (Adam Hanuš) Ticket - Upravit checklist, aby položka vedla rovnou na místo akce (např. doprava)

- (Jan Kudrlička) Položit dotaz Honzovi Černému v hlavním vlákně na datum lednových prezentací

- (Adam Hanuš) Připravit nástřel ekonomického modulu a plán sprintu 5 ještě před planningem sprintu 5

- (Adam Hanuš) Poslat další demo ve čtvrtek 19.11.

- (Tomáš Kříž) Dát feedback k čtvrtečnímu demu v pátek

- (Petr Jiránek) Provést stresový test platformy (100 termínů, 1000 účastníků, dlouhá jména)

## Přijatá rozhodnutí

- Platby kartou se neřeší; platby se hromadně nahrávají ze simulovaného bankovního výpisu (CSV).

- Ekonomický modul je hlavní cíl sprintu 5, druhou prioritou rozvoj komunity.

- Zítřejší večerní stand-up se ruší.

- Daily obsahuje jen dostupnost, operativní info a blockery; PR čekající dva dny se v daily připomene.
