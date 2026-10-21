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

**Přihlášené části:** sidebar 240 px (`bg/subtle`, pravá hairline), horní lišta 64 px (role, přepínače, účtové menu), obsah s odsazením 32 / 32 / 48 a mezerami 24. Pod 768 px se sidebar schová do vysouvacího panelu (shadcn Sheet, 288 px, překryv černá 50 %) otevíraného tlačítkem menu v horní liště: M08 (zavřeno) a M09 (otevřeno) na stránce 06 Mobil. Horní lišta na mobilu: menu, logo, jazyk bez šipky, motiv, avatar.

**Dialogy:** karta se stínem `shadows/popover`, radius 12, nadpis H3.

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
- U04 Moje přihláška: odkaz „← Všechny přihlášky“ je DS / Button Quiet bez levého odsazení, zarovnaný pod nadpisem; termíny jsou řádky oddělené hairline se štítkem stavu a částkou; platba má nadpis H2, tři DS / Metric bez pomocného řádku a samostatnou kartu „Údaje pro doplatek“ s řádky popisek–hodnota (popisky bez dvojtečky).

**Známé odchylky v kódu:**

- Odkaz „Podpora Togeny“ v sidebaru chybí, dokud neexistuje kanál podpory.
- Text „Otevřít navigaci“ u tlačítka menu je jen pro čtečky, ve Figmě je to název vrstvy.
- U04: karta „Údaje přihlášky“ (jméno, narození, zákonný zástupce) chybí, API tyto údaje nevrací; poznámka o placení potvrzeného termínu je pod termíny.
- U01: doplňkové texty u přihlášek („Místo zajištěno“, „Pořadí 2“) chybí, karta ukazuje jen štítky termínů z API.
- Hover primárního tlačítka je v kódu `bg-primary/90`, ve Figmě `raw/teal-hover` `#006f63`.
