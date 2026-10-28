# Status s PO (28. 10. 2026)

## Retro a spolupráce

- Tomáš Kříž oceňuje společný kanál, díky němu vidí průběžně, co tým dělá; procesně je vše v pohodě.
- Tomáš Kříž aplikaci ještě neproklikal celou, chyběly mu přístupy ke stagingu a pobídky k průběžnému feedbacku.
  - Chce, aby ho tým během sprintu upozorňoval na novinky na stagingu ještě před demem

## Priority dalšího sprintu

- Platí plán Sprintu dle návrhu PO
- Vyvážit pohled organizátor a účastník, nezapomínat ani na návštěvníka webu. Hlavní prioritou organizátora je vyhodnocování přihlášek a náhradníků v administraci.
- Účastník potřebuje důvod se do aplikace vracet (úprava přihlášky, platba, kontakt na organizátora); nápady nechává na týmu.
- Chce aspoň jeden poutavý, interaktivní frontend prvek (kalendář, mapa, drag and drop), ideálně u vyhodnocování kapacit ubytování.
- Navržený Kanban přihlášek je možný, ale hromadné akce musí zůstat; Jan Kudrlička jej po schůzce považuje za složitý a méně vhodný.
- Do odsouhlaseného rozsahu patří také
  - zbývající flow přihlášky,
  - ruční režim schvalování,
  - profil uživatele,
  - založení organizace formou self-onboardingu
  - opravy

## Upřesnění požadavků

- Platby: možnost editace, doplnění a záporné platby jako vratky; vratka nemá navazovat automaticky na odhlášení.
- Důležité je vidět v reálném čase, kolik účastník dluží vůči jednotlivým termínům, na které je potvrzený (příklad 500 Kč a 700 Kč). Platba se proto váže k termínu.
- Strava: checkboxy (vegetariánská, bezlepková) plus textové pole pro alergie; přeskočení náhradníků se musí automaticky logovat a být snadno dohledatelné organizátorovi, povinný komentář není potřeba.
- Ubytování a pokoje mají být per termín, ne per akce, kvůli různé kapacitě; Jan Kudrlička navrhuje šablony pro opakované akce.
- Veřejné údaje o akci se mohou převzít ze založení akce a doplnit například o fotografii. Přesný seznam polí nebyl určen; musí ale existovat jedno místo, odkud veřejný web informace čerpá.
- Profil uživatele má pokrýt základní správu účtu, například úpravu údajů, změnu e-mailu a hesla.

## Web, design a security report

- Landing page má působit jako produktový web s katalogem akcí, fotkami a ilustracemi; backoffice má zůstat přehledný. Landing Page je rozcestník pro všechny potenciální uživatele platformy a navádí je podle jejich problému.
- Aplikace týmů splývají šedomodrým základem ("smutný"), cílem je zapamatovatelná individuální značka, případně akcentní barva.
- Security report bez daného formátu: zkontrolovat knihovny a závislosti (např. neopravená verze Node), klidně OWASP, ukázat na demu.
- Tým zvažuje vzor Togena jako grafický prvek v pozadí celé aplikace.

## Interní debata po schůzce

- Platformový admin s přístupem ke všem organizacím zatím neexistuje; Adam Hanuš nevidí byznysovou potřebu v tomto sprintu.
- Runner (agent kontrolující projekt) se zaeviduje jako technický ticket a zmíní se na demu jako práce navíc.
- Tým má mezitím přemýšlet o hodnotě pro účastníka, frontend prvku a landing page, případně řešit bugy.

## Další kroky

- (Jan Kudrlička) Vytvořit ticket pro runner jako technický základ
- (Jakub Kafka) Navrhnout brandovější vzhled aplikace s využitím vzoru a vektorů Togena ve Figmě
- (Petr Jiránek) Poslat Tomáš Kříž přístupové údaje ke stagingu a Gmail, kam chodí maily

## Přijatá rozhodnutí

- Plán sprintu byl odsouhlasen v plném rozsahu; hlavní prioritou je vyhodnocování přihlášek a náhradníků, současně se má posílit účastnická a veřejná část.
- Platba se zaváže ke konkrétnímu termínu. Systém má průběžně ukazovat zbývající dluh podle potvrzených termínů a evidovaných plateb.
- Vratky ani storno poplatky se nebudou vytvářet automaticky při odhlášení; vratku lze evidovat zápornou platbou.
- Ubytování, pokoje, jejich kapacity a dostupnost se budou řešit po jednotlivých termínech, nikoli pouze za celou akci.
- Případný Kanban nesmí nahradit hromadné operace nad přihláškami.
- Název termínu bude volitelný, termín se primárně definuje datem.
- GDPR má nízkou prioritu, jen základní smysluplné zásady (organizátor je správcem údajů účastníků, Togena jejich zpracovatelem; Togena je správcem údajů organizátorů).
- Formulář přihlášky bude zachovávat vyplněné údaje při refreshi.
- Tomáš dostane přístupy ke stagingu a tým ho bude během sprintu aktivně upozorňovat na novinky, aby mohl dát zpětnou vazbu ještě před demem.
- Runner se zaeviduje jako technický ticket a na demu se uvede jako práce navíc.
- Platformový administrátor se do tohoto sprintu nezařazuje; zatím pro něj nebyla potvrzena byznysová potřeba.

## Návrh PO o obsahu sprintu: Tomášův návrh (plné znění)

### Návštěvník webu

- Najdu v katalogu organizace a jejich akce a proklikám se až na přihlášku.
- U akce vidím fotky, místo, termíny, ceny a kontakt.
- Web působí jako skutečný produkt a zapamatuju si ho: fotky, ilustrace, vlastní barvy a styl.
- Je vyladěný na mobilu i na počítači.

### Účastník

- Vidím svoje přihlášky a jestli v termínu jedu, nebo jsem náhradník.
- Sám si opravím údaje, změním termín nebo se odhlásím. Když už běží storno podmínky, schvaluje to organizátor.
- Vidím, kolik mám zaplatit a kolik jsem zaplatil, a zaplatím přes QR (jen simulace).
- Dozvím se, když se mi něco změní.
- Vyplním dopravu, stravu (výběr + vlastní text) a zdravotní omezení.
- Na pohlaví se mě zeptáte citlivě, jen kvůli pokojům.
- **Modul navíc podle vás**, který mi dá důvod do aplikace chodit. Třeba jídelníček nebo výběr programu.

### Organizátor

- **Hlavní cíl: vyhodnocování přihlášek a náhradníků, dobře zpracované v administraci.** Nechám ho běžet samo, nebo ho spustím ručně, a potvrzuju hromadně.
- Kapacita pokojů, přistýlky a dostupnost pokojů se můžou mezi týdny lišit.
- Když se uvolní místo, vidím, kdo je na řadě. Fronta je zvlášť pro každý termín a typ pokoje.
- Pořadí umím doložit. Když ho ručně změním, je vidět proč.
- Výsledek odejde účastníkovi sám, i s platbou, v jedné zprávě.
- Nastavím, co se o akci ukáže veřejně.
- Nastavím, odkdy běží storno podmínky. Pak schvaluju změny termínů a odhlášení.
- Upravím přihlášku za účastníka a opravím chybně zapsanou platbu.

### Tým

- **Vylepšení UX/UI.** Do pondělí 2. 11. mi nasdílejte návrhy ve Figmě. Buď si zavoláme a okomentujete mi je, nebo mi je pošlete přes Teams. Udělejte značku zapamatovatelnou a sjednoťte vzhled všude: mobil, desktop, web pro návštěvníky, potvrzovací e-maily.
- **Security audit.** Aktualizujte knihovny a závislosti a nastavte si sledování zranitelností (aktuální příklad je brotli). Výstupem je security report.
