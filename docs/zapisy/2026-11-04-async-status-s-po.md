# Async status s PO (4. 11. 2026)

Asynchronní status s Product Ownerem (Tomáš Kříž) místo středečního statusu 4. 11. Tým poslal dotaz na priority, tři rozhodnutí k potvrzení ano / ne a odkaz na guidelinu k proklikání (Petr Jiránek: Guidelina pro PO | Tým 1 – Kemp.io). Odpovědi PO přišly později; poznámky k věcem mimo demo se projdou jako feedback k zapracování v dalším sprintu.

Znění dotazů je plné. V odpovědích PO je doplněná diakritika a upravená stylistika, obsah je nezměněný.

### Úvod

**Tým:** Ahoj Tomáš Kříž, posílám slíbený asynchronní status.

**PO:** Čau, sorry za pozdní reakci. Je mi jasný, že dneska do dema už moje poznámky nebudou mít moc přidanou hodnotu, ale můžeme je pak projít jako feedback k zapracování v dalším sprintu.

### Priority a redesign

**Dotaz:** V první řadě ještě dotaz na priority. Tys povolil snížit prioritu kompletního redesignu appky. Honza Č. ale v hlavním kanále podle nás na UX/UI klade velký důraz. Opravdu stačí ukázat rozpracovaný rebranding? Neradi bychom pak dostali kritiku od Honzy. UX v appce průběžně zlepšujeme. Prosím tedy jen o ujasnění priorit.

**Odpověď PO:** Okomentujte to přesně, jak píšete: podle domluvy děláme průběžně UX úpravy v appce a zároveň chystáme pro příští sprint větší redesign, ze kterého je tady náhled. Za mě takhle v pohodě.

### A) Potřebujeme tvoje ano / ne

Tohle jsme rozhodli my. Stačí napsat, jestli ti to sedí.

#### A1. Rozdělení souhrnné platby

**Dotaz:** Když účastník pošle jednu platbu za víc termínů, rozdělí se od nejstaršího termínu. Chybějící část zůstane na nejpozdějším termínu. Přeplatek zůstane na poslední potvrzené přihlášce a vrací se vratkou. Platí to?

**Odpověď PO:** Rozdělení souhrnné platby: osobně vnímám platbu za akci jako celek. Neřeším, ke kterému termínu se která část vztahuje, ale kolik má účastník celkem zaplatit, případně kolik má na akci přeplatek nebo nedoplatek. Jaká bude vnitřní logika na BE, je mi celkem jedno.

#### A2. Lhůta na zaplacení

**Dotaz:** Organizátor si ji nastaví u akce, výchozí je 10 dní od potvrzení. Když se místo uvolní až těsně před akcí, třeba týden předem, přihláška je rovnou po splatnosti a systém urguje platbu.

**Odpověď PO:** Lhůta na zaplacení: může tam být nějaká výhybka, aby se v tu chvíli neposílala upomínka o nezaplacení. Zároveň je ale dobré u takových lidí vyvolat nějakou míru urgence a chtít po nich, aby zaplatili před začátkem akce.

#### A3. Změny a odhlášení

**Dotaz:** Dokud neběží storno podmínky, účastník si může přihlášku, termíny i odhlášku měnit sám a bez schválení. Schvaluje až organizátor po začátku storna.

**Odpověď PO:** Změny a odhlášení: OK.

### B) Co si můžeš proklikat (Petr Jiránek: Guidelina pro PO | Tým 1 – Kemp.io)

#### Vyhodnocování přihlášek (tvoje hlavní priorita)

**Dotaz:** U akce zvolíš, jestli se přihlášky vyhodnocují automaticky, nebo ručně.

**Odpověď PO:** Automatický / ruční režim: tady jsem se nachytal. Založil jsem akci, vyplnil pokoje (dobře zapracované připomínky k nastavení míst mezi termíny a kopírování kapacit) a pak se mi automaticky otevřelo přihlašování a způsob vyhodnocení už nešel změnit. Bylo by dobré nad tím mít nějakou kontrolu, nebo přihlašování neotevírat automaticky. To bude asi jedna z dalších funkcí: nastavení termínu pro otevření přihlášek.

**Dotaz:** V ručním režimu nové přihlášky čekají ve frontě k vyhodnocení. Můžeš je vybrat víc najednou a hromadně potvrdit, zařadit mezi náhradníky nebo zamítnout.

**Odpověď PO:** Fronta a hromadné vyhodnocení: chvíli mi trvalo to najít, ale funkčně mi to přijde dobré. Ještě bych se zamyslel nad vyhodnocením náhradníků: systém teď dobře potvrdí ty, kteří se vejdou, ale chtěl bych mít možnost rovnou označit ostatní jako náhradníky.

**Dotaz:** Jednu přihlášku jde vyhodnotit i ručně v jejím detailu. Systém varuje, když by potvrzení přesáhlo kapacitu.

**Odpověď PO:** Detail přihlášky s varováním při překročení kapacity: OK.

**Dotaz:** Pořadník náhradníků je zvlášť pro každý termín a typ lůžek.

**Odpověď PO:** Pořadník náhradníků: OK.

**Dotaz:** Když se místo uvolní, vidíš náhradníky, kteří se na něj hodí, a jednoho potvrdíš.

**Odpověď PO:** Uvolněné místo: OK.

**Dotaz:** Seznam přihlášek si pamatuje filtry.

**Odpověď PO:** Pamatování filtrů: OK.

#### Nastavení akce a web

**Dotaz:** Pokoje a kapacity se nastavují zvlášť pro každý termín.

**Odpověď PO:** Pokoje a kapacity po termínech: OK.

**Dotaz:** Název termínu je nepovinný, termín se pozná podle data.

**Odpověď PO:** Nepovinný název termínu: OK.

**Dotaz:** Organizátor nastaví veřejnou stránku akce (popis, místo, fotka, kontakt, termíny, ceny) a rozhodne, jestli akci zveřejní v katalogu. Zveřejněnou akci vidí všichni a návštěvník se z katalogu proklikne až na přihlášku.

**Odpověď PO:** Veřejná stránka akce a katalog: OK.

#### Účastník

**Dotaz:** V Moje přihláška je kontakt na organizátora, telefon jde na mobilu vytočit klepnutím.

**Odpověď PO:** Kontakt na organizátora: OK.

**Dotaz:** V profilu jde změnit jméno, jazyk, heslo i e-mail.

**Odpověď PO:** Profil: OK.

**Dotaz:** Účastník dostává e-maily při potvrzení, zařazení mezi náhradníky, zamítnutí a odhlášení, v nastaveném jazyce.

**Odpověď PO:** E-maily: OK.

#### Platby: co se změnilo

**Dotaz:** Platba teď patří ke konkrétnímu termínu, ne k celé přihlášce. Díky tomu je vidět, kolik zbývá doplatit za který termín (tvůj příklad 500 Kč a 700 Kč).

**Odpověď PO:** Platba ke konkrétnímu termínu: viz komentář nahoře k bodu A1, stačí mi platba k akci, nebo aspoň z pohledu administrátora.

**Dotaz:** Variabilní symbol má dvě úrovně. Platba na symbol celé přihlášky zaplatí všechno, co se dluží, a systém ji rozdělí mezi termíny. Platba na symbol jednoho termínu zaplatí jen ten termín.

**Odpověď PO:** Bez samostatné odpovědi; viz A1.

**Dotaz:** Přeplatek se nikam samo nepřevádí. Organizátor ho vrátí vratkou, tedy zápornou platbou.

**Odpověď PO:** Bez samostatné odpovědi; viz A1.

### Závěr

**PO:** Díky a těším se na demo!
