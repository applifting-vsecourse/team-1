# Figma remake (Future Teal): pravidla pro pokračování

Tento soubor popisuje, jak se předělávají obrazovky Togeny do nového vizuálního stylu ve Figmě. Platí pro každého člověka i agenta, který na remaku pokračuje. Cílem je, aby každá další obrazovka vypadala, jako by ji udělal stejný autor.

> **Rozsah.** Remake je implementovaný i v kódu (`apps/frontend`) na větvi `docs/figma-remake` (PR #112) a **čeká na schválení product leadem**. Pravidla, která remake mění (stín na kartách, karty jako sekce stránky, centrovaný hero s kartami funkcí, velikosti tlačítek, `accent` jako tón), jsou propsaná do [`DESIGN.md`](../DESIGN.md), `CLAUDE.md` a `.claude/agents/reviewer.md`. Obrazovky, které v remaku ještě nejsou (přihláška V07 / M02, kostry stránek), jen dědí nové tokeny. Kontrast primární barvy zůstává otevřený (viz Známé odchylky).

## Soubory

| Co                        | Soubor                                                                | Poznámka                                                                                  |
| ------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Zdroj obsahu a hierarchie | Design system `P7CQo6rDSptsyLvCR55b8J`                                | Jen ke čtení. Hi-fi rámce jsou odkázané v issues jednotlivých stories.                    |
| Remake                    | „Togena – Remake (Future Teal)“ `Oxlrm0tdW7aWH6C1rbP0fO` (tým 4ME486) | Stránka **Komponenty** `0:1` obsahuje kit, stránka **Obrazovky** `1:42` hotové obrazovky. |
| Vizuální předloha         | tweakcn theme „Future Teal“ (vzhled shadcn/ui)                        | Barvy jsou převzaté přesně, v oklch převedených na sRGB.                                  |

## Co se přebírá a co se mění

**Zachovává se** (z originálního hi-fi rámce):

- pořadí a hierarchie sekcí na obrazovce,
- veškerý český text, **doslova**, včetně ukázkových dat (Eva Malá, Letní kemp Lipno 2027…),
- stavy, které rámec kreslí (chyba, prázdno, neplatný odkaz…).

**Mění se** (UI/UX):

- vzhled podle shadcn/tweak, tedy karty, štítky (Badge), progress bary, sidebar a dropdown menu,
- rozložení, pokud tím obrazovka získá jasnější hierarchii,
- typ ovládacího prvku jen tam, kde je to zjevné zlepšení UX. Každou takovou změnu uveď v souhrnu.

**Nesmí se:**

- vymýšlet text, popisky polí ani prvky, které v originálu nejsou. Například popisky „Jméno / E-mail“ u údajů, které originál ukazuje bez nich, sem nepatří.
- používat dekorace, které připomínají logo (rohové „závorky“). Uživatel je výslovně odmítl.
- přidávat ilustrace, abstraktní grafiku nebo náhledy produktu pod hero („čistý hero“).
- používat typické „AI“ vzory: gradienty, glow, emoji, sekce jen na vyplnění místa.

Když v originálu něco chybí (stav, chybová hláška), nedomýšlej to. Vynech to a napiš to do souhrnu.

## Tokeny a styly

Žádná hardcoded barva ani rozměr. Každý fill a stroke je navázaný na proměnnou (`setBoundVariableForPaint`), každý text na textový styl.

**Kolekce Theme** (módy Light `1:0` / Dark `1:1`): `background` `VariableID:1:3`, `foreground` `1:4`, `card` `1:5`, `popover` `1:6`, `primary` `1:7`, `primary-foreground` `1:8`, `secondary` `1:9`, `secondary-foreground` `1:10`, `muted` `1:11`, `muted-foreground` `1:12`, `accent` `1:13`, `accent-foreground` `1:14`, `destructive` `1:15`, `border` `1:16`, `input` `1:17`, `ring` `1:18`. Dále `sidebar-*`, `chart-1..5` a `*-foreground`, které se dohledávají podle jména.

**Kolekce Metrics:** `space/1..12` (`1:20`–`1:27`), `radius/md` 6 `1:28`, `radius/lg` 8 `1:29`, `radius/xl` 12 `1:30`, `size/control` `1:31`, `size/control-lg` `1:32`.

**Textové styly** (Inter, čísla JetBrains Mono):

| Styl                                | Použití                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| Hero 60/64 Bold · Hero mobile 40/44 | jen landing                                                          |
| Section title 36 Bold               | nadpis veřejné stránky na desktopu (přihlášení, 403)                 |
| Display 30/36                       | nadpis veřejné stránky na mobilu a nadpis stránky v aplikaci (`h1`)  |
| H1 24/32 · H2 18/28 · H3            | nadpisy karet a sekcí (karta = H2)                                   |
| Lead 18/28                          | úvodní odstavec pod hero                                             |
| Body · Body small                   | text a doplňkový text (`muted-foreground`)                           |
| Label                               | názvy položek v řádcích, tučnější hodnoty                            |
| Caption                             | malý popisek, např. role v horní liště („ORGANIZÁTOR“, tracking 6 %) |
| Number                              | čísla v monospace                                                    |
| Button lg                           | popisek XL tlačítek                                                  |

**Efekty:** `Shadow / sm` je na kartách (jako v shadcn), `Shadow / Popover` na plovoucích prvcích.

**Česká typografie:** za jednopísmennými předložkami a spojkami a uvnitř částek a počtů piš nezlomitelnou mezeru (` `), např. `k rozhodnutí`, `55 200 Kč`, `ve 3 termínech`.

## Kit (stránka Komponenty)

Obrazovky skládej **jen z instancí kitu**. Když kus chybí, přidej ho nejdřív do kitu jako komponentu navázanou na tokeny a teprve potom ho použij.

| Komponenta                 | ID       | Vlastnosti a poznámky                                                                                                                                                                                                                      |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Logo                       | `2:2`    |                                                                                                                                                                                                                                            |
| Button (set)               | `2:19`   | Primary / Outline / Ghost × Default 40 / Large 44, k tomu Primary XL `7:38` a Outline XL `15:20` (48 px se šipkou). Text `Label#2:0`. Instance nemá slot na ikonu, takže do ní nic nevkládej (Figma to odmítne).                           |
| Icon button / Theme toggle | `2:20`   |                                                                                                                                                                                                                                            |
| Public header              | `2:36`   | Logo a „Actions“ (Language switcher + theme toggle). Padding se přepisuje na instanci: desktop 208, mobil 16.                                                                                                                              |
| Language switcher          | `17:23`  | `Language#17:0`                                                                                                                                                                                                                            |
| Feature card               | `9:11`   | `Title#9:0`, `Description#9:1`, `Icon#9:2`. Po výměně ikony přebarvi vektory na `accent-foreground`.                                                                                                                                       |
| Badge                      | `9:26`   | `Label#9:3`. Výchozí je teal. Neutrální varianta (Koncept, typ účtu) má fill `secondary` a text `secondary-foreground`.                                                                                                                    |
| Progress                   | `9:28`   | Šířka potomka „Indicator“ = podíl. Při 0 je indikátor skrytý.                                                                                                                                                                              |
| Field                      | `19:30`  | `Label#19:0`, `Value#19:1`, `Hint#19:2`, `Show hint#19:3`                                                                                                                                                                                  |
| Alert / Destructive        | `19:35`  | `Title#19:4`, `Description#19:5`. Fill má 8 % a stroke 30 % opacity. Paint vytvoř rovnou s `opacity` a teprve pak navaž proměnnou.                                                                                                         |
| Account dropdown (set)     | `21:138` | Organizer Closed `21:68` / Open `21:76`, Participant Closed `21:103` / Open `21:111`                                                                                                                                                       |
| Nav item (set)             | `21:155` | State Default / Active, `Label#21:0`, `Icon#21:3`                                                                                                                                                                                          |
| Ikony (lucide)             |          | calendar-range `5:12`, bed-double `5:22`, list-checks `5:28`, wallet `5:35`, arrow-right `5:39`, lock `21:30`, settings `21:34`, log-out `21:38`, plus `21:43`, layout-grid `21:47`, calendar `21:53`, users `21:59`, chevron-down `21:65` |

## Vzory obrazovek

Každá obrazovka je jeden auto-layout rámec pojmenovaný `<kód> / <název z originálu> / Desktop|Mobil`. Desktop je široký 1440, mobil 360. Rámce se kladou na stránku Obrazovky do řádků podle oblasti a nesmí se překrývat.

**Veřejné stránky** (landing, přihlášení, 403, přihláška):

- vertikální rámec s fillem `background`, nahoře instance Public header, pod ní `main` s `counterAxisAlignItems = CENTER`,
- odsazení `main`: desktop 80 nahoře a 112 dole, mobil 40 / 48,
- obsahový sloupec je na desktopu 440 px pevně (formuláře), na mobilu vyplňuje šířku,
- nadpis je centrovaný: Section title na desktopu, Display na mobilu, pod ním `muted-foreground` Body,
- obsah je v kartě, hlavní akce je XL tlačítko přes celou šířku karty s centrovaným popiskem,
- chyby jsou Alert / Destructive nad formulářem, ikonový motiv je ikona v kruhu s fillem `accent` (např. zámek na 403).

**Landing:** centrovaný hero (Hero styl, „bez zmatku“ v `primary`), pod ním dvě XL tlačítka **„Jsem organizátor“** (primary) a **„Jsem účastník“** (outline) bez otázky nad nimi. Aplikace se jimi dělí na část pro organizátory a pro účastníky. Pak `muted` sekce „Co v Togeně vyřídíte“ s mřížkou 2×2 karet Feature card a zápatí.

**Přihlášené části (shell):**

- vodorovný rámec 1440 × 900 (výška roste s obsahem, minimum 900),
- **sidebar** 240 px: fill `sidebar`, pravý stroke `sidebar-border`, padding 16. Obsahuje logo, seznam Nav item (aktivní položka má `sidebar-accent`) a dole „Potřebujete pomoc?“ s podtrženým odkazem „Podpora Togeny“ v `accent-foreground`,
- účastník nemá navigaci, jen logo a nápovědu (stejně jako originál). Na stránkách mimo navigaci, například v nastavení účtu, není aktivní žádná položka,
- **horní lišta** 64 px: fill `card`, spodní stroke `border`, padding 32. Vlevo role (Caption, „ORGANIZÁTOR“ / „ÚČASTNÍK“), vpravo theme toggle a Account dropdown,
- **obsah** má padding 32 / 32 / 48 a mezery 24. Nadpis stránky je Display s `muted` popisem. Primární akce stránky stojí vpravo vedle nadpisu,
- formulářové a nastavovací stránky mají sloupec 784 px, přehledy (dashboard, seznamy) plnou šířku.

**Karty:**

- fill `card`, stroke `border` 1, radius `radius/xl`, efekt `Shadow / sm`, padding 24 (karty v seznamu mají 20 nahoře a dole),
- nadpis karty je H2. Řádky uvnitř karty oddělují **hairline** (horní stroke `border`) a nikdy vnořená karta,
- řádek s akcí: vlevo Label s Body small (`muted`), vpravo tlačítko. Hlavní akce je primary, ostatní outline,
- položka seznamu (akce): titulek H2 se šipkou `arrow-right` v `accent-foreground`, meta v Body small, pak řádek se stavem: Badge, počet (Label) a Progress přes zbytek šířky. Aktuální nebo vybraná položka má stroke `primary` 1,5.

**Mobil:** stejné pořadí sekcí, sloupce vyplňují šířku, tlačítka jsou pod sebou přes celou šířku, Hero mobile / Display místo desktopových stylů. Textům ve flex řádcích nastav `FILL` a `textAutoResize = HEIGHT`, jinak se oříznou.

**Jedno primary na obrazovku.** Pokud jich originál má víc, nejdůležitější zůstane primary a ostatní budou outline. Výjimkou je karta „Co vyžaduje pozornost“, kde je primary jen první úkol.

## Postup práce

1. **Pořadí:** nejdřív obrazovky, které už jsou v team-1 implementované, potom stories, které jsou na řadě (proudy v [PROJEKT.md, sekce 6](PROJEKT.md)). Nedělej všechno najednou: dávka má 1–4 obrazovky.
2. **Načti originál.** Rámec najdeš přes issue dané story, `// Figma:` komentář v kódu nebo podle kódu obrazovky (O01, S10…). Texty si přečti read-only skriptem `use_figma` nad souborem Design system (`findAll` TEXT). Jako kontrolu porovnej texty s `apps/frontend/src/i18n/locales/cs/*.json`.
3. **Postav obrazovku** z kitu podle vzorů výše. Pokud už existuje obrazovka se stejným shellem, naklonuj ji (`clone()`) a vyměň obsah. Shell nestav znovu.
4. **Zkontroluj screenshot** (`get_screenshot`): oříznutý text, šířky, zalomení nadpisů, přesah rámce.
5. **Ukaž dávku uživateli** a vyjmenuj odchylky od originálu: co chybí, co se změnilo a proč. Na další dávku jdi až po odpovědi.

### Technické poznámky k Figma Plugin API

- Načti skilly `figma-use` a `figma-generate-design` a v `use_figma` předávej `skillNames: "figma-use,figma-generate-design"`.
- Nastav `await figma.setCurrentPageAsync()` jednou na volání a vracej ID všech vytvořených uzlů.
- Fonty: Inter „Regular“, „Medium“, „Semi Bold“, „Bold“ a JetBrains Mono „Medium“. Načti je před každou úpravou textu.
- Do instance nejde vkládat potomky (`insertChild` selže). Chybějící slot přidej do komponenty.
- Když `use_figma` selže, skript se vrátí celý zpět. Zkontroluj plátno, oprav chybu a spusť skript znovu.
- Po `setProperties` s INSTANCE_SWAP si ikona nechá původní barvu tahu, takže ji přebarvi ručně.
- Když klonuješ komponentu nebo variantu, zkontroluj `componentPropertyReferences` u textu. Bez něj ukáže výchozí „Tlačítko“.
- `resize()` přepne sizing na FIXED, takže `HUG` / `FILL` nastavuj až po něm a až po `appendChild`.

## Hotovo

| Obrazovka                           | Desktop  | Mobil    |
| ----------------------------------- | -------- | -------- |
| V08 / M07 Landing                   | `10:20`  | `10:157` |
| S01 Přihlášení organizátora         | `20:170` | `20:213` |
| S13 Přihlášení organizátora – chyba | `20:256` | `20:308` |
| S10 Přihlášení účastníka            | `20:360` | `20:407` |
| S14 Přihlášení účastníka – chyba    | `20:454` | `20:506` |
| S06 Přístup odepřen (403)           | `21:570` | `21:612` |
| O01 Dashboard organizátora          | `26:528` | –        |
| O30 Nastavení účtu organizátora     | `28:580` | –        |
| U13 Nastavení účtu účastníka        | `28:698` | –        |

**Další na řadě:** mobilní O01 / O30 / U13. Potom přihláška V07 / M02 (US-23) včetně neplatného odkazu a dál podle proudů: US-12 nová akce, US-13/16 termíny a ceny, US-14 pokoje, US-40 cena ve formuláři, US-25 potvrzení, US-04 nastavení hesla (S09), US-54 moje přihláška, US-52 přehled přihlášek, US-44 platby, US-29 obsazenost.

**Známé odchylky:**

- Primary `oklch(0.704 0.14 182.5)` s bílým textem má kontrast asi 2,6:1, takže nesplňuje AA. Uživatel zvolil přesné barvy tweaku. Pro kód je potřeba rozhodnutí tech leada.
- O30 / U13 zatím nemají sekce „Zabezpečení“ a „Oznámení“, protože nejsou implementované (vlastní stories).
- „Vytvořit akci“ je bez ikony plus, Button nemá slot na ikonu.
- Typ účtu je zobrazený jako neutrální Badge.

Udržuj tabulku „Hotovo“ a seznam odchylek aktuální po každé dávce.
