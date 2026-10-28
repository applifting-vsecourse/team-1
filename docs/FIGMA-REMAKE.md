# Redesign Togeny ve Figmě: pravidla pro pokračování

Tento soubor popisuje, jak se obrazovky Togeny převádějí do nového vzhledu. Platí pro každého člověka i agenta, který na redesignu pokračuje, aby každá další obrazovka vypadala, jako by ji udělal stejný autor.

> **Rozsah.** Redesign se dělá přímo v **původním** souboru Design system `P7CQo6rDSptsyLvCR55b8J`. Vzhled komponent a obrazovek je ve stylu shadcn/ui (v kódu PR #112). Od 21. 10. 2026 mají primitivy DS / Primitives hodnoty barev ze souboru „Togena – Remake (Future Teal)“ `Oxlrm0tdW7aWH6C1rbP0fO` (téma Light / Dark); aliasy v DS / Semantic se nemění. Výjimky: primární barva je ztmavená z `#00bba7` na `#007f72` (hover `#006f63`, stisk `#005f55`), aby bílý text tlačítek měl kontrast aspoň 4,5 : 1; text odkazů a info stavů má tmavší `raw/teal-deep` `#006363` kvůli kontrastu a rámeček ovládacích prvků (`raw/control`) zůstal původní kvůli kontrastu 3 : 1.

## Co se mění a co zůstává

**Zůstává** (z původních hi-fi rámců):

- pořadí a hierarchie sekcí, veškerý český text doslova, všechny kreslené stavy,
- tokeny z kolekcí DS / Semantic (Light / Dark) a DS / Metrics (hodnoty barev viz Rozsah).

**Mění se:**

- písmo je všude Inter (DS / Display 60/64 Bold, H1 36/44 Bold, H2 24/32 Semi Bold, H3 18/26 Semi Bold, Lead 18/28),
- karty mají stín `shadows/surface`, radius 12 (`radius/lg`) a odsazení 24; nadpis karty je H3,
- kostra aplikace: sidebar bez rámečků u položek, horní lišta 64 px, záhlaví stránky s nadpisem a popisem vlevo a hlavní akcí vpravo,
- tabulky z řádků mají šedé záhlaví sloupců a řádky oddělené hairline,
- stavové panely vypadají jako DS / Alert: podklad `status/*-bg`, rámeček v barvě tónu na 30 %, radius 12,
- dekorativní kompozice z loga zmizely (landing, přihlášení, boční panel přihlášky).

**Nesmí se:** vymýšlet text, popisky ani prvky, které původní rámec nemá; přidávat ilustrace, gradienty, glow nebo sekce na vyplnění místa.

## Rohy loga jako značka aktivního stavu

Dva oblouky z loga (DS / Graphic / Active corners `13134:19498`) označují **jednu aktivní věc** na obrazovce:

- **ano:** aktivní položka sidebaru, aktivní záložka, aktuální krok průvodce, vybraná nebo aktuální karta akce (O01),
- **ne:** řádky tabulek, stránkování, ovládací prvky, štítky, tlačítka, hover, prázdné stavy, dekorace, seznamy bez výběru (U01).

V sidebaru je jen jeden marker: když je otevřená konkrétní akce, nadřazená položka „Akce“ má jen podbarvení a rohy má aktivní podstránka.

**Animace:** rohy přijedou z odsazení 6 px a zároveň se objeví (180 ms, ease-out). Při `prefers-reduced-motion` se jen objeví. V kódu je to atom `ActiveCorners`, který se zobrazí uvnitř prvku s `data-status="active"`.

## Tokeny a styly ve Figmě

- Každý fill a stroke je navázaný na proměnnou z DS / Semantic. Paint vždy vytvoř s barvou získanou přes `variable.resolveForConsumer(node)`; s barvou `{0,0,0}` se náhled vykreslí černě.
- Průhlednost rámečku (30 %) nastav až na navázaném paintu: zkopíruj `node.strokes`, změň `opacity` a přiřaď zpět. Když se opacity nastaví na čerstvém paintu z `setBoundVariableForPaint`, Figma ji zahodí.
- Efekty: `shadows/surface` (karty), `shadows/popover` (menu, dialogy). Textové styly DS / *.
- Česká typografie: nezlomitelná mezera za jednopísmennými předložkami a spojkami.

## Vzory obrazovek

**Veřejné stránky:** hlavička přes celou šířku (fill surface, spodní hairline, logo, „Přihlásit se“, přepínač jazyka), obsah na `canvas`. Přihláška je sloupec 800 px, systémové stránky (přihlášení, 403, 404) vystředěný sloupec 440 px: dlaždice s ikonou, nadpis, popis a pod tím karta s vysvětlením a tlačítky přes celou šířku.

**Landing (V08 / M07):** centrovaný hero (Display, „bez zmatku“ v `color/text/link`), Lead, dvě tlačítka 44 px „Jsem organizátor“ (primary) a „Jsem účastník“ (secondary), na desktopu 200 px, na mobilu přes celou šířku. Pak pás `bg/subtle` „Co v Togeně vyřídíte“ s mřížkou 2×2 karet DS / Landing / Feature a zápatí s horní hairline.

**Přihlášené části:** sidebar 240 px (`bg/subtle`, pravá hairline) jen s položkami Akce / Organizace (DS / App sidebar; dashboard se zrušil 25. 10.) a dole s účtem (N / Sidebar account, od 25. 10.), horní lišta 64 px (role, jazyk, vzhled; DS / App top bar), obsah s odsazením 32 / 32 / 48 a mezerami 24. Pod 768 px se sidebar schová do vysouvacího panelu (shadcn Sheet, 288 px, překryv černá 50 %; DS / Mobile drawer) otevíraného tlačítkem menu v horní liště: M08 (zavřeno) a M09 (otevřeno) na stránce 06 Mobil. Horní lišta na mobilu (DS / Mobile top bar, 56 px) má menu, logo, jazyk a vzhled (stejné komponenty jako na desktopu); účet je dole v draweru.

**Detail akce (organizátor):** sekce akce (Přehled, Přihlášky, Kapacity, Platby, Ubytování, Nastavení) nejsou v sidebaru ani v draweru, ale v záložkách pod záhlavím akce (O / Event tabs) na všech šířkách. Záhlaví: „← Všechny akce“ (Button Quiet), H1 název + štítek stavu přihlášky, meta řádek, záložky. V sidebaru je „Akce“ jen tónovaná bez rohů (DS / App sidebar „Akce v detailu“), rohy loga má aktivní záložka. Na mobilu (< 768 px) záložky nahrazuje sticky tlačítko pod horní lištou s názvem aktuální sekce a šipkou („Přehled“), které otevře DropdownMenu se všemi sekcemi (N8 / N9, N / Event section switcher); drawer v detailu akce položky akce nemá (M11). Drobečková navigace na stránkách akce není, podstránky mají „← Zpět na …“ a nadpis H2.

**Obsah stránek:** jedna primární akce na pohled (vpravo v záhlaví sekce nebo karty), další akce Secondary / Quiet. Souhrny jako řada DS / Metric. Tabulky: záhlaví sloupců `bg/subtle` 40 px, řádky min. 56 px s hairline, částky vpravo, akce v řádku jako ikonová tlačítka (DS / Icon button: pencil, trash, ⋯ pro DropdownMenu, chevron pro detail). Filtry jsou toolbar nad tabulkou (hledání + Selecty). Potvrzení úspěchu je toast (Sonner, vpravo dole; na mobilu dole přes šířku), ne alert v obsahu; změněný řádek se zvýrazní `bg/selected`.

**Dialogy:** karta se stínem, radius 12, nadpis H3 s popisem a zavíracím křížkem, souhrn v boxu `bg/subtle`, výsledek („Po uložení …“) oddělený hairline, patička vpravo: Secondary + Primary / Destructive; destruktivní akce uvnitř editačního dialogu (Zrušit termín, Smazat pokoj) je červený Quiet vlevo. Ve Figmě se kreslí nad ztmavenou stránkou, ze které se otevírají.

## Postup práce

1. Načti původní rámec (issue story nebo `// Figma:` komentář v kódu) a jeho texty read-only skriptem.
2. Uprav ho podle vzorů výše; kostru aplikace a veřejnou hlavičku přebírej z hotových obrazovek (O01, V07).
3. Zkontroluj screenshot: oříznuté texty, stíny, zalomení nadpisů.
4. Ukaž dávku tech leadovi a vyjmenuj odchylky. Kód měň až po schválení.

Plugin API: `skillNames: "figma-use,figma-generate-design"`, jedna stránka na volání, fonty Inter „Regular / Medium / Semi Bold / Bold“ načíst před úpravou textu, `resize()` před nastavením `HUG` / `FILL`. Verzi souboru ukládej ručně (File → Save to version history), plugin to neumí.

## Stav (2026-10-21)

Hotové jsou všechny obrazovky na stránkách HF / 01–06 kromě e-mailů S17: komponenty, landing V08 / M07, systémové stránky S01–S16, přihláška V02–V07h a M02–M06, organizátor O01–O34, účastník U01 / U04 / U13 a dialogy X16–X23. Účastnické přihlášení odpovídá magic linku: S10 (+ S10a odesláno, S10b chyba), S15 neplatný odkaz, nová S18 vstup odkazem, S09 bez jednorázového hesla, e-maily S17 a potvrzení V04 / M06 s odkazem. Logo je všude „togena“ malými písmeny. Přibyly komponenty DS / Theme switcher, DS / Icon / menu a sun; přepínač jazyka a motivu je ve všech hlavičkách a horních lištách.

**21. 10.:**

- Barvy: DS / Primitives mají hodnoty z tématu Togena Remake (Light / Dark) s výjimkami popsanými v Rozsahu; primární barva je `#007f72`. V kódu #130 a #131.
- U01 Přihlášky: karty přihlášek podle karty akce z O01, stavy termínů jako DS / Badge (Success, Waitlist), bez rohů loga (seznam bez výběru).
- Termíny všude s rokem a pod datem s názvem termínu (U01, U04, komponenty DS / Term option a DS / Event term row v přihlášce V02–V07h a M02–M06).
- Účastník nevidí, že je náhradník: nepotvrzený termín má neutrální štítek „Čeká na potvrzení“, potvrzený „Potvrzeno“ (i v DS / Registration term status na V04 / V06 / M06). U přihlášky je štítek stavu platby: Nezaplaceno, Částečně zaplaceno (Warning), Zaplaceno (Success), Přeplatek (Info). Mobilní U01 a U04 (360 px, stavy částečně zaplaceno / zaplaceno / přeplatek) jsou ve stejném vzhledu jako desktop.
- U04 Moje přihláška: odkaz „← Všechny přihlášky“ je DS / Button Quiet bez levého odsazení, zarovnaný pod nadpisem; termíny jsou řádky oddělené hairline se štítkem stavu a částkou; platba má nadpis H2, tři DS / Metric bez pomocného řádku a samostatnou kartu „Údaje pro doplatek“ s řádky popisek–hodnota (popisky bez dvojtečky).

**Známé odchylky v kódu:**

- Odkaz „Podpora Togeny“ v sidebaru chybí, dokud neexistuje kanál podpory.
- Text „Otevřít navigaci“ u tlačítka menu je jen pro čtečky, ve Figmě je to název vrstvy.
- U04: karta „Údaje přihlášky“ (jméno, narození, zákonný zástupce) chybí, API tyto údaje nevrací; poznámka o placení potvrzeného termínu je pod termíny.
- Hover primárního tlačítka je v kódu `bg-primary/90`, ve Figmě `raw/teal-hover` `#006f63`.

## Stav (2026-10-23)

Oprava obrazovek z posledních US podle původních návrhů O01 / U01 / U04 a nová navigace (čeká na schválení, kód zatím beze změny). Původní podoba je na stránce **ARCHIV / Před úpravou 23. 10.** Rámce jsou přestavěné na místě, ID uzlů v `// Figma:` komentářích platí dál.

- Nové komponenty v sekci „DS / Doplnění 23. 10.“ na DS / 02: ikony (more-horizontal, pencil, trash, copy, link, arrow-left, globe, moon, monitor, external-link, circle-check, circle, chevron-right, filter, eye, ban, banknote, gauge), DS / Icon button, DS / Toggle item, DS / App sidebar, DS / App top bar, DS / Mobile top bar, DS / Mobile drawer, O / Event tabs.
- Organizátor desktop: O02 / O02a (seznam akcí jako tabulka s toolbarem, toast po založení), O03a (formulář 784 px, Název první, Organizace + Typ vedle sebe, patička Zrušit / Založit akci), O04 rodina, O05 rodina (25 rámců), O08 Kapacity, O09, O12 Platby, O18 / O18a / O18b Ubytování, O24 Nastavení (Termíny první, patička Zrušit akci | Náhled přihlášky | Uložit nastavení), O34a–O34o detail platby.
- Dialogy X16–X24c nad ztmavenou stránkou O24 / O18a.
- Mobil: M08 / M09 s novou horní lištou a drawerem, nové M10 Přehled akce, M11 drawer v detailu akce, M12 Přihlášky akce, M13 Detail platby; U01 / U04 360 px s DS / Mobile top bar.

## Stav (2026-10-25)

Návrh N1–N9 schválil tech lead; je na stránce **HF / 07 Návrh 25. 10.** (uzel `14178:1377`) a v kódu je hotový. Má přednost před odstavci výše, kde si odporují.

- **Dashboard zrušen.** Organizátor po přihlášení přistane na Akcích; sidebar má Akce a Organizace. Panel „Co vyžaduje pozornost“ se nad seznam akcí doplní, až budou data z US-29 / US-52 (N1).
- **Účet dole v sidebaru** (vzor ChatGPT / shadcn NavUser): avatar s iniciálami, jméno, e-mail, ikona ⇅. Klik otevře menu nad sebou (Nastavení účtu, Odhlásit se; „Podpora Togeny“ až bude kanál podpory). Stejný blok je dole v mobilním draweru a z horní lišty účet zmizel (N2, N7).
- **Horní lišta:** desktop role vlevo, jazyk a vzhled vpravo; mobil (56 px) menu, logo, jazyk a vzhled. Volby jazyka a vzhledu už nejsou v draweru (N6).
- **Mobilní detail akce:** místo posuvných záložek jedno tlačítko s názvem aktuální sekce a šipkou, menu se všemi sekcemi s ikonami a zaškrtnutou aktivní (N8, N9). Desktop zůstává se záložkami.
- **Kapacity:** seznam všech termínů (N4) s Progress pro ženy a muže (u společných pokojů jeden sloupec), celý řádek vede na detail termínu (`?termId=`); detail (N3) má karty s čísly „x / y“, Progress a šipkou, karta vede na filtrované přihlášky. Žádná podtržená čísla ani procenta textem.
- **Co chybí ke zpřístupnění:** kroužkový checklist bez „1 / “, počítadlo „0 ze 2 hotovo“ (N5 = O04a).

## Úprava mobilního přehledu (#176, 2026-10-28)

- Přepínač sekcí zobrazuje pouze aktuální sekci a šipku; údaj o pořadí („1 z 5“) se odstraňuje. Nabídka dál obsahuje všechny sekce a označuje aktivní položku.
- Kopírování odkazu je pouze v kartě pro sdílení; duplicitní tlačítko vedle nadpisu přehledu se odstraňuje na všech šířkách. Nadpis a popis mají dostupnou šířku. U nepřipravené akce zůstává checklist bez kopírování.
- Návrh změny je odsouhlasený v #176. Ve Figmě je upravený N / Event section switcher (`14179:986`); změnu převzaly instance N8 / N9 a oba náhledy byly vizuálně zkontrolované. Tato úprava má pro implementaci přednost před starším zobrazením pořadí.
