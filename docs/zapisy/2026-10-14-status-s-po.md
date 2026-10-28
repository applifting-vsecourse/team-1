# Status s PO (14. 10. 2026)

Sync s PO k rozsahu MVP: upřesněny kapacity, platby, přihláška, termíny a oddělené účty. Tým si rozdělil práci, technický návrh do soboty dopoledne.

## Rozsah MVP

- Optimistický scénář PO výrazně přesahuje odhad týmu, záměrně se testuje vývoj s agentickými nástroji
- Kapacity: stačí seznam místností s kapacitou, podle nich se vyhodnocuje ubytování
- Platby bez brány: organizátor ručně označí, zda daný účastník zaplatil; bonusem je pole se zaplacenou částkou
- Účastník nepotřebuje portál: po přijetí přihlášky dostane potvrzovací e-mail a další e-mail při každé změně stavu. Otevřená otázka: jak ho motivovat k návratu do platformy?

## Přihláška a právní texty

- Klíčová pole: jméno, příjmení, datum narození a výběr termínu; kontakt na zákonné zástupce později
- Pro reálnou akci užitečné: stravovací a zdravotní omezení, doprava (autobus/vlastní), poznámka
- Formulář má trvat do dvou minut, doplňkové údaje patří až pod login po odeslání
- Stačí zaškrtávátko souhlasu se zpracováním osobních údajů, odkaz na podmínky volitelný

## Repozitář a GitHub

- Repozitář je public, nejasné, proč Honza Černý žádá přidání; svůj handle neposlal
- PO chce GitHub jako živý stav: storky a issues navázané na aktuální sprint

## Interní plánování týmu

- Claude porovnal zadání se storkami: chybí jen landing page, některé storky jsou příliš široké
- Jan Kudrlička upozornil, že Claude bývá v odhadech náročnosti příliš pesimistický
- Jan Kudrlička považuje za reálné udělat účty organizátora i účastníka už v MVP

## Další kroky

- (Tomas Kriz) Napsat Honzovi Černému na Slacku ohledně přístupu k repozitáři
- Adam: Rozpadnout backlog a přidat storku na landing page (s Péťou)
- Adam: Zadat Kubovi high fidelity wireframy pro tento sprint
- Adam: Poslat shrnutí do Teamsu a Péťovi návrh rozpadu storek od Clauda
- (Jan Kudrlička) Navrhnout technický základ a rozdělení práce, konzultovat s Erikem, do soboty dopoledne
- (Všichni) Napárovat storky a issues na sprint v GitHubu a průběžně je udržovat

## Přijatá rozhodnutí

- Akce je jeden celek s více termíny, organizátor vyhodnocuje každý termín zvlášť
- Účty organizátora a účastníka budou oddělené, případně i se dvěma různými e-maily
- Flow začíná na veřejné landing page s tlačítkem do části pro organizátory

## Návrh PO o obsahu sprintu: Tomášova představa o MVP (plné znění)

Ahoj, s druhým týmem jsme se dnes domluvili na tomhle rozsahu osekaného MVP pro implementaci do příštího review.

Neočekávám, že to na první dobrou bude všechno dokonalé, ale mělo by nám to dát nějaký základ nad kterým můžeme iterovat a rozvíjet další funkce.

Zamyslete se, jestli to dává smysl v kontextu vašeho backlogu a jakým způsobem to poskládat a rozdělit.

Zítra na syncu k tomu probereme detaily.

Jeden průchod přihláška → ubytování → platba, který funguje od začátku do konce a dá se ukázat na demu.

### Návštěvník webu

1 požadavek

- Na landing page produktu si přečte, co systém umí, a proklikne se na přihlášení.

### Organizátor

6 požadavků

- Přihlásí se ke své organizaci a vidí jen její akce a přihlášky.
- Založí akci s více termíny a cenou za termín a rozešle přímý odkaz na přihlášku.
- Zadá ubytování, tedy pokoje a lůžka. Kapacita termínu se počítá z nich, ne z jednoho čísla „volná místa“.
- Vidí obsazenost po termínech a seznam přihlášek s filtrem podle termínu, stavu a placení.
- Potvrzuje účast podle volné kapacity ubytování. Ručně, nebo automaticky, podle volby týmu.
- Zapíše přijatou platbu a vidí, kdo kolik dluží.

### Účastník

4 požadavky

- Přes odkaz od organizátora vyplní pevný přihlašovací formulář, i na mobilu.
- Vybere jeden nebo víc termínů a hned vidí cenu.
- Přihláška se uloží vždy, i když je plno. Účastník je pak potvrzený, nebo náhradník.
- Po odeslání vidí svůj stav a kolik a kam zaplatit, a dostane potvrzovací e-mail.
