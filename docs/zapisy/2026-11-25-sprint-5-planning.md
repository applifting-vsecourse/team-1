# Status s PO – plánování sprintu 5 (25. 11. 2026)

## Požadavky PO

### Ekonomický modul

**Hlavní cíl: v Togeně vidím, jestli se mi akce vyplatí**

Ekonomický modul, jak jsme se bavili na refinementu. Zapíšu náklady a vidím, kolik mě akce stojí, kolik vyberu a co zbyde. Fixní náklady (areál, doprava, lektoři) i variabilní, odhadem (cena × počet lidí) i podle účtenky. Ať to sedne i jiným akcím než táborům.

#### Kontext z [Product refinement a status s PO (17. 11. 2026)](2026-11-17-product-refinement-a-status-s-po.md)

- Ekonomický modul je hlavní cíl sprintu 5. Doplnit nákladovou stránku, aby finanční řízení nezůstalo jen u plateb.
- Zahrnout fixní náklady, např. areál a dopravu, rozpočítání na účastníky, mzdy lektorů i variabilní náklady před akcí a během ní.
- U variabilních nákladů uvažovat výpočet jednotková cena × počet účastníků i zápis skutečného výdaje podle účtenky.
- Modul navrhnout obecně pro různé organizátory.

#### Prototyp

##### Výsledek

- **Jak dneska odpovídáš na otázku "Vyplatí se mi akce?" a "Vyplatila se mi akce?" ?**

  > - **Odpověď PO:** Před otevřením přihlášek Tomáš z rozpočtu odvodí cenu a hledá bod zvratu, tedy minimální počet účastníků, při kterém akce pokryje náklady.
  > - Po otevření sleduje počet přihlášených a plánuje rezervu, aby akce vyšla i při výpadku zhruba 10 lidí.
  > - S účastníkem počítá po zaplacení, ideálně do 10 dnů od přihlášky.
  > - Proto jsou pro něj důležité upomínky.
  > - K otázce „Vyplatila se mi akce?“ Tomáš popsal, že průběžně doplňuje skutečné výdaje do rozpočtu.
  - Jak po akci uzavírá a vyhodnocuje celkový výsledek, na schůzce nerozvedl.

##### Náklady

- **Jak se dneska dozvídáš náklady? Tzn. kdy v procesu (před přihláškami, těsně před akcí, nebo až po) a jak moc jsou informace konkrétní (nejdřív odhad, pak zpřesnění, nebo pevná cena)**

  > - **Odpověď PO:** Ceny největších položek, ubytování a stravy, zná ještě před otevřením přihlášek a podle nich nastavuje cenu akce.
  > - Dopravu odhaduje z cen minulého ročníku s rezervou na inflaci, materiál podle minulých ročníků.
  > - Už během příprav a pak i na akci zapisuje skutečné výdaje proti plánu.
  > - Například na reproduktor plánoval 5 000 Kč a koupil ho za 4 590 Kč.

##### Co kdyby

- **Jaká je priorita této feature?**

  > - **Odpověď PO:** Ekonomický modul je hlavní priorita sprintu 5.
  > - Scénář „Co kdyby“ má pro Tomáše vysokou hodnotu při nastavování ceny a ověřování bodu zvratu.
  > - Tomáš potvrdil, že spočítat si cenu před otevřením přihlášek je situace, kterou při organizaci reálně řeší.
  > - Při nedostatku kapacity navrhl zjednodušit zápis výdajů na souhrnné položky plus/mínus jako jednu možnost a případně vynechat scénář jako další možnost.

#### Otázky na PO

- **Ze zkušenosti, jaké ad-hoc náklady (tzn. mimo klasické kategorie doprava, areál, strava atd.) se ti vyskytovaly a jak si je řešil?**

  > - **Odpověď PO:** Během akce dokupuje třeba papíry, nůžky a svačiny.
  > - Jako příklad většího nečekaného výdaje uvedl servis nebo výměnu elektrocentrály.
  > - Kryje je z rozpočtové rezervy a při podrobnějším sledování je třídí podle kategorií.
  > - Když je rozpočet napjatý, chce v modulu vidět plán a průběžné čerpání.

- **Jsou jiné příjmy než z přihlášek?**

  > - **Odpověď PO:** Dalším příjmem jsou podle Tomáše storno poplatky při odhlášení v posledních 30 dnech.
  > - Pokud místo obsadí náhradník, zadržená část původní platby je příjem navíc.
  > - U sponzoringu, dotací nebo zůstatku z minulého ročníku mu stačí ručně přidat obecnou příjmovou položku jako v Excelu.
  > - Samostatné typy příjmů mají nízkou prioritu.

- **Jak důležité je pro tebe účetnický pohled na ekonomiku akce? Je to odlišný pohled než manažerský.**

  > - **Odpověď PO:** Pro MVP stačí manažerský přehled.
  > - Pokladny, cash flow a účetní evidenci Tomáš řeší mimo Togenu předáním přehledu výdajů a účtenek.
  > - Jako volitelné doplnění by uvítal možnost přiložit fotku účtenky k výdaji.

- **Stačí pohled přes akci?**

  > - **Odpověď PO:** Ano, pro Tomášovy akce stačí souhrn za celou akci.
  > - U akcí s více termíny zůstává otevřené, jak počítat náklady závislé na počtu účastníků a délce jejich pobytu.
  > - U stravy Tomáš zmínil počet porcí podle termínu a počtu dnů.

### Dotáhnout

#### Design

Projít aplikaci podle vlastních návrhů - co zkompaktnit a zpřehlednit, hlavně na mobilu. Honza nabízel, že vám ukáže UI chyby, které se v aplikaci opakují. Jestli se s ním spojíte, nechám na vás.

Pracujeme na tom průběžně, ladíme a zjednodušujeme design, zjednodušeujeme texty, s Honzou se spojíme.

#### Program

projděte znovu vzhled a ovládání a dotáhněte to, ať se s ním dobře pracuje

Máme konkrétně v backlogu:

- Založení tažením ve stylu google calendar
- Kopírování na úrovni dnů i bloků

#### Stravování

vidím, kolik porcí čeho je potřeba na který den, podle toho, kdo tam ten den je, i s pozdějšími příjezdy a dřívějšími odjezdy. Výstup pro kuchyň si vytisknu.

Máme konkrétně v backlogu:

- Požadované úpravy

**Pro agenta**: teď pracujeme špatně se souhrny, protože se překrývají. Potřebujeme konkrétní počty ke všem kombinacím, které daná akce nabízí. To znamená: pokud je lidí pět (vegetariánů tři, bezlepkové a jeden bezlepkový a vegetarián zároveň), tak ten jeden, co je zároveň, se do těch předchozích dvou nezapočte. Bude tam explicitně zmíněná kombinace těchto omezení.

#### Ubytování

stejně vidím, kolik lůžek je obsazených který den, podle toho, kdy kdo přijede a odjede.

Máme v backlogu:

- Požadované úpravy
- Vylepšení přiřazovacího algoritmu (opakované navrhování rozložení v průběhu přihlašování, kombinace typů pokojů pro větší flexibilitu)

---

## Schůzka s Honzou Černým ohledně designu - před nebo po hodině.

**Domluva:** Tým se sejde s Honzou Černým kvůli zpětné vazbě k designu před nebo po přednášce v pondělí 30. 11. Tomáš se kvůli služební cestě nepřipojí. Adam na schůzce vysvětlí dosavadní produktová rozhodnutí. Přesný čas se na planningu neurčil.
