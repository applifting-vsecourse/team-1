# Business katalog e-mailů

Pracovní verze k 3. 11. 2026, doplněná o šest rozhodnutí PM z dotazníku v této konverzaci. Rozhodnutí jsou potvrzená; konkrétní texty a design zatím schválené nejsou. Popisuje požadovanou komunikaci Togeny z pohledu přihlašovatele a uživatele účtu. Katalog není technický návrh. Texty, otevřené otázky a schválení jsou vedeny odděleně; existence zprávy v kódu neznamená její business schválení.

## Rozsah a zdroje

- Přihlášky: [EMAILY.md](../procesy/zpracovani-prihlasky/EMAILY.md) a související procesní a stavové modely.
- Účty a přístup: komunikace při přihlášení, obnově hesla a změně adresy. Samostatné obecné ověření adresy je rozhodnutím PM vyřazeno; založení účtu odesláním přihlášky doprovází e-mail s magic linkem.
- ID níže jsou pracovní označení katalogových položek, nikoli požadavek na názvy v kódu.
- [TEXTY.md](TEXTY.md) obsahuje návrhy konkrétního znění. [SYSTEM.md](SYSTEM.md) vymezuje správu katalogu a předání vývoji.

## Jak číst katalog

- **Přihlašovatel** podává přihlášku za sebe nebo za jiné osoby a přijímá komunikaci o přihlášce. Nemusí být účastníkem akce.
- **Účastník** je osoba, jejíž účast se řeší. Zpráva musí umožnit poznat, kterého účastníka a termínu se týká.
- „Za přihlášku“ znamená jednu zprávu pro danou přihlášku při jedné business události, i když se změní více jejích termínů. Neznamená jednu zprávu za každý termín.
- Účel odpovídá na otázku, co má příjemce po přečtení vědět. Očekávaná reakce říká, zda má něco udělat.

## Přihlášky

Příjemcem všech následujících zpráv je přihlašovatel. Uvedená čísla odkazují na řádky EMAILY.md.

| ID a název | Business událost | Účel a povinné sdělení | Očekávaná reakce | Rozsah zprávy |
| --- | --- | --- | --- | --- |
| APP_RECEIVED – Přijetí přihlášky | Odeslání přihlašovacího formuláře; č. 1 | Potvrdit přijetí. Uvést akci, účastníky a stav každého přihlášeného termínu. V ručním režimu sdělit čekání na vyhodnocení, v automatickém výsledek. U potvrzených termínů uvést platební údaje. Zpřístupnit přihlášky; při založení účtu odesláním přihlášky zahrnout magic link, nikoli žádost o obecné ověření adresy. | Zkontrolovat přihlášky; platit pouze za potvrzené termíny podle uvedených pokynů. | Jeden souhrn za celé odeslání, i pro více účastníků. |
| APP_CONFIRMED – Potvrzení účasti | Organizátor potvrdí dosud nevyhodnocenou přihlášku nebo je potvrzena účast náhradníka; č. 2 a 5 | Sdělit, že se s účastí počítá. Identifikovat potvrzené termíny a uvést platební údaje. U náhradníka odlišit uvolnění lůžka od prvního vyhodnocení. | Uhradit požadovanou platbu a případně otevřít detail přihlášky. | Za přihlášku; více potvrzených termínů společně. |
| APP_WAITLISTED – Zařazení mezi náhradníky | Organizátor vyhodnotí přihlášku jako náhradníka; č. 3 | Sdělit zařazení mezi náhradníky v konkrétních termínech. Nesdělovat pořadí ani platební údaje. | Vyčkat na případné potvrzení; za nepotvrzené termíny zatím neplatit. | Za přihlášku. |
| APP_REJECTED – Zamítnutí | Organizátor zamítne účast při vyhodnocení nebo později; č. 4, 9 a 10 | Sdělit zamítnutí a zrušení přihlášky v dotčených termínech. Nezaměnit za odhlášení účastníka ani zrušení celé akce. | Vzít změnu na vědomí; případně otevřít přihlášku. | Za přihlášku. |
| APP_WAITLIST_EXPIRED – Nezískání lůžka | Nastane půlnoc Europe/Prague prvního dne termínu a přihláška zůstává náhradníkem; č. 6 | Sdělit, že se lůžko neuvolnilo a přihláška v dotčeném termínu byla zrušena. | Vzít zrušení na vědomí. | Za přihlášku; souběžně dotčené termíny společně. |
| PAYMENT_OVERDUE – Výzva k zaplacení | U potvrzené přihlášky uplyne lhůta pro zaplacení, zůstává dluh a organizátor požaduje automatické odeslání; č. 7 | Jednorázově upozornit na neuhrazenou platbu. Identifikovat dotčenou účast a uvést platební údaje podle platebních pravidel. | Uhradit nedoplatek. | Za přihlášku, bez automatického opakování. |
| PAYMENT_SETTLED – Potvrzení zaplacení | Přihláška v termínu přejde z potvrzené s dluhem na potvrzenou a zaplacenou; č. 8 | Potvrdit, že účast v uvedených termínech je zaplacená. Nevytvářet další požadavek k platbě. | Vzít potvrzení na vědomí; není vyžadována další platba za uvedené termíny. | Za přihlášku; současně doplacené termíny společně. |
| PAYMENT_CORRECTED – Oprava potvrzení zaplacení | Po odeslaném potvrzení zaplacení organizátor opraví nebo odstraní chybnou platbu a u přihlášky v termínu znovu vznikne dluh; nové rozhodnutí PM | Automaticky upozornit na opravu, vysvětlit, že předchozí potvrzení již neplatí, a uvést aktuální nedoplatek s platebními údaji. Neoznačovat jako upomínku po splatnosti. | Seznámit se s opravou a uhradit uvedený nedoplatek. | Za přihlášku, pouze pro dotčené termíny. |
| APP_CANCELLED_BY_APPLICANT – Potvrzení odhlášení | Účastník se odhlásí; č. 11 | Potvrdit odhlášení a jednoznačně uvést dotčeného účastníka a termíny. Nezaměnit za zamítnutí organizátorem. | Zkontrolovat rozsah odhlášení. | Za přihlášku. |
| APP_CONFIRMATION_WITHDRAWN – Odvolání potvrzení | Organizátor přesune potvrzenou přihlášku s dluhem mezi náhradníky; č. 13 | Výslovně sdělit, že dříve potvrzená účast již potvrzená není a přihláška je mezi náhradníky. Odlišit od prvního vyhodnocení. Nesdělovat pořadí. | Vzít změnu na vědomí a vyčkat na další výsledek. | Za přihlášku. |
| APP_WAITLIST_CANCELLED – Zrušení náhradníka organizátorem | Organizátor zruší přihlášku náhradníka; č. 14 | Sdělit zrušení přihlášky v dotčených termínech a to, že jde o rozhodnutí organizátora, nikoli o nezískání lůžka při začátku termínu. | Vzít zrušení na vědomí. | Za přihlášku. |
| EVENT_TERM_CANCELLED – Zrušení termínu akce | Organizátor zruší termín akce; č. 15 | Sdělit zrušení termínu i přihlášky v něm. Informovat o vrácení případných zaplacených plateb podle platných pravidel, nikoli nepravdivě potvrdit již provedené vrácení. | Vzít zrušení na vědomí a řídit se informacemi organizace o dalším postupu. | Za přihlášku, nikoli jeden hromadný e-mail všem přihlašovatelům. |

### Společná pravidla přihlášek

- Potvrzení přijetí jde v jazyce přihlášky. Následné změny jdou v preferovaném jazyce uživatele, a pokud není zvolený, v jazyce jeho první přihlášky; podrobnosti stanoví EMAILY.md a D-078.
- Změnová zpráva zahrnuje pouze přihlášky v termínech, na které je účastník přihlášený a kterých se daná změna týká. Nezměněné termíny ani jiné účastníky neopakuje. Potvrzení odhlášení zůstává i pro odebraný termín; obdobně zůstávají katalogové zprávy o zrušení účasti.
- U současných změn více termínů téže přihlášky má příjemce dostat jeden přehled pouze dotčených termínů. Různé výsledky nesmí překrýt zavádějící společný nadpis. Prvotní potvrzení odeslaného formuláře je nadále souhrn celého odeslání, ne změnová zpráva.
- Platební údaje patří do přijetí přihlášky v automatickém režimu s potvrzenou účastí, potvrzení účasti, výzvy k zaplacení a nově také do upozornění na opravu zaplacení. Ve zrušených přihláškách nejsou. Poslední rozšíření vychází z rozhodnutí PM v dotazníku a zatím není promítnuto do původního EMAILY.md.
- Automatická výzva po splatnosti odejde pouze na požadavek organizátora, jednou a bez automatického opakování. Upozornění na opravu zaplacení je jiný druh komunikace, ne tato výzva.
- Při zamítnutí nebo odhlášení již zaplacené účasti zpráva neslibuje automatické vrácení peněz. Uvede: „Informace o případném vrácení platby vám sdělí organizátor.“ Při zrušení celého termínu akce zůstává informace o vrácení plateb podle platných pravidel.
- Výpočet částek, pravidla variabilních symbolů a evidence plateb nejsou součástí tohoto katalogu. E-mail pouze komunikuje údaje určené platební doménou.
- Zprávy nemají sdělovat pořadí náhradníků ani slibovat neodsouhlasené lhůty, sankce či datum vrácení peněz.

## Účty a přístup

U všech těchto zpráv je rozsah jedna zpráva k dané žádosti. Žádost o změnu adresy vytváří dvě různá sdělení pro dvě různé adresy.

| ID a název | Business událost a příjemce | Účel a povinné sdělení | Očekávaná reakce | Jazyk |
| --- | --- | --- | --- | --- |
| AUTH_MAGIC_LINK – Přihlašovací odkaz | Přihlašovatel požádá o přístup; příjemcem je přihlašovatel na adrese svého účtu. | Umožnit přihlášení bez hesla. Vysvětlit účel odkazu a co dělat, pokud o něj příjemce nežádal. | Použít odkaz pro přihlášení, jinak jej nepoužívat. | Jazyk rozhraní v okamžiku žádosti, jinak angličtina. |
| AUTH_RESET_PASSWORD – Obnova hesla | Uživatel požádá o obnovu hesla; příjemcem je uživatel na adrese svého účtu. | Umožnit nastavení nového hesla. Jasně odlišit žádost od již provedené změny hesla. | Nastavit nové heslo, nebo nevyžádanou žádost ignorovat. | Jazyk účtu; výchozí angličtina podle současné komunikace. |
| AUTH_CHANGE_EMAIL_VERIFY – Potvrzení změny adresy | Uživatel požádá o změnu přihlašovací adresy; příjemcem je tentýž uživatel na nové adrese. | Vysvětlit, z jaké adresy na jakou se má přihlášení změnit a že změna vyžaduje potvrzení. | Potvrdit vyžádanou změnu; jinak odkaz nepoužívat. | Jazyk účtu. |
| AUTH_CHANGE_EMAIL_NOTICE – Upozornění na žádost o změnu adresy | Uživatel požádá o změnu adresy a je odesláno ověření na novou; příjemcem je uživatel na dosavadní adrese. | Upozornit na žádost, uvést novou adresu a bezpečnostní doporučení. Neoznamovat dokončenou změnu. | Při vlastní žádosti vzít na vědomí; při nevyžádané žádosti zabezpečit účet podle uvedených pokynů. | Jazyk účtu. |

## Kdy samostatný e-mail neodchází

- Archivace přihlášky po proběhlém termínu; č. 12 v EMAILY.md.
- Nastavení režimu vyhodnocování, pokojů a otevření přihlášek samy o sobě nevyvolávají e-mail účastníkovi.
- Přístupový odkaz vložený do potvrzení přihlášky není další samostatná zpráva. Při založení účtu přihláškou neodchází žádost o obecné ověření e-mailové adresy. To neruší potvrzení změny přihlašovací adresy.
- Více účastníků v jednom odeslání nemá vytvářet více potvrzovacích e-mailů. Více současně změněných termínů jedné přihlášky nemá vytvářet zprávu za každý termín.
- Obnova hesla a žádost o změnu adresy neznamenají, že heslo či adresa už byly změněny.

## Potvrzená rozhodnutí z dotazníku

Zdroj: odpovědi PM v této konverzaci. Dotazník byl dokončen; finální kontrola celého katalogu a schválení konkrétní textace jsou samostatné kroky.

| Otázka | Potvrzené pravidlo |
| --- | --- |
| 1. Obecné ověření adresy | Vyřadit. Účet vzniká odesláním přihlášky a e-mail obsahuje magic link, bez samostatného potvrzování adresy. |
| 2. Dotčené termíny | Změnová komunikace pouze k přihlášeným a změnou dotčeným termínům. Potvrzení odhlášení se posílá i po odebrání termínu. Z odpovědi se neodvozuje další univerzální e-mail o libovolné editaci. |
| 3. Výzva k zaplacení | Automaticky jen tehdy, když to organizátor požaduje; jedna výzva po uplynutí lhůty, bez automatického opakování. |
| 4. Oprava zaplacení | Při vzniku dluhu po opravě dříve potvrzeného zaplacení automaticky odeslat upozornění na opravu a aktuální platební údaje, nikoli upomínku. |
| 5. Zrušení po platbě | Zamítnutí a odhlášení: o případné refundaci informuje organizátor, e-mail ji automaticky neslibuje. Zrušení celého termínu: informace o vrácení plateb zůstává. |
| 6. Kontakty | Přihlášky, účast a platby řeší organizátor akce; přihlášení, heslo a zabezpečení účtu podpora Togeny. E-mail uvede příslušný kontakt a odpovědi směřují stejnému příjemci. |

## Kontakty a další upřesnění

- Kontaktní pravidlo se vztahuje na uvedený kontakt i na příjemce odpovědi na zprávu. Konkrétní adresy organizátorů a podpory zatím tímto dotazníkem určeny nejsou; před uvedením do provozu musí být dostupné.
- Nová rozhodnutí je potřeba promítnout do původního EMAILY.md, souvisejících modelů a registru rozhodnutí. V tomto kroku se aktualizuje pouze business katalog a jeho navazující podklady; registry, modely, GitHub a aplikace se nemění.
- Původní EMAILY.md ještě uvádí „první heslo“ u přijetí přihlášky. Katalog podle odpovědi PM počítá s magic linkem; ten odpovídá také existujícímu rozhodnutí D-008.
- Platná lhůta pro zaplacení se přebírá z platebních pravidel. Její konkrétní délku dotazník neurčil. Také případné další kroky po nezaplacení výzvy zůstávají mimo tato rozhodnutí; odpověď na četnost e-mailů sama neřeší automatické rušení přihlášek.

## Orientační pokrytí v aplikaci

Tato příloha pouze pomáhá navazujícímu vývoji najít existující práci. Vychází ze čtení checkoutu e8a839c dne 3. 11. 2026, ne z ověření skutečného doručení. Zjištění se mohou s dalším vývojem změnit.

| Oblast | Orientační zjištění | Podklad |
| --- | --- | --- |
| Přijetí přihlášky | Nalezeno odesílání souhrnu. | [Mailer přihlášek](../../apps/backend/src/modules/participants/services/application-confirmation-mailer.service.ts) |
| Potvrzení, náhradník, zamítnutí a odvolání potvrzení | Nalezeno odesílání při ruční změně stavu. Automatické potvrzení náhradníka po uvolnění lůžka nebylo nalezeno. | [Změny stavů](../../apps/backend/src/modules/applications/services/term-status.service.ts) |
| Nezískání lůžka | Nalezeno napojení automatického zrušení náhradníka. | [Expirace náhradníků](../../apps/backend/src/modules/applications/services/waitlist-expiry.service.ts) |
| Výzva k zaplacení a potvrzení zaplacení | Odesílání nenalezeno; pro potvrzení zaplacení existuje [#210](https://github.com/applifting-vsecourse/team-1/issues/210). | [Platby](../../apps/backend/src/modules/payments/services/payments.service.ts) |
| Odhlášení účastníka a zrušení termínu | Nalezeny textové varianty či šablony, nikoli jejich odesílání. | [Šablony](../../apps/backend/src/core/email/templates/) |
| Přihlašovací odkaz, obnova hesla a změna adresy | Nalezena odpovídající komunikace; existující obecná ověřovací šablona je mimo schválený business rozsah. | [Přístup do účtu](../../apps/backend/src/shared/auth/providers/better-auth.provider.ts), [přihlašovací odkaz](../../apps/backend/src/shared/auth/magic-link/magic-link.plugin.ts), [změna adresy](../../apps/backend/src/modules/account/services/email-change.service.ts) |

Existující texty a vzhled nejsou tímto schválené. [#260](https://github.com/applifting-vsecourse/team-1/issues/260) je návaznost pro texty a design; [#178](https://github.com/applifting-vsecourse/team-1/issues/178) zachycuje otázku přístupového odkazu. Aktuální obsah Figmy a produkční doručení nejsou touto inventurou ověřeny.
