# Otevřené otázky

> Generováno z [`otazky.yaml`](otazky.yaml) (`python generate.py`). Needituj, měň YAML.

**95 neuzavřených** otázek, **15 uzavřených**.

## Role

| Role | Popis | Kdo |
| --- | --- | --- |
| `pm` | product manager | Adam |
| `tech-lead` | tech lead | Honza |
| `design` | design | Kuba |
| `qa` | QA | Petr |
| `po` | product owner, za klienta | Tomáš |

## Kdo má tah

### `pm` (Adam): 80

| ID | Otázka | Dotčené US | Priorita | Proč |
| --- | --- | --- | --- | --- |
| [Q-BEZ-04](#q-bez-04) | Má být magic link i v e-mailu o změně přihlášky a v jakých případech e-mail magic link neobsahoval? | [#178](https://github.com/applifting-vsecourse/team-1/issues/178) | P1 | Potvrzená chyba: potvrzovací e-mail nesplňuje akceptační kritérium (zápis 27. 10.). |
| [Q-KOM-06](#q-kom-06) | Který e-mail dorazil anglicky a v jakém jazyce byl UI při odeslání přihlášky a při žádosti o odkaz? | [#183](https://github.com/applifting-vsecourse/team-1/issues/183) | P1 | Potvrzená chyba (jazyk e-mailu), zápis 27. 10. ji vede jako otevřený bod k ověření. |
| [Q-NAS-04](#q-nas-04) | Co všechno má přihlašovatel o akci vidět, než podá přihlášku? Má být stránka dostupná komukoliv, nebo jen přes odkaz od organizátora? | [US-22](https://github.com/applifting-vsecourse/team-1/issues/22) | P1 | Veřejná stránka akce je v návrhu PO pro sprint 3 (návštěvník webu) a seznam polí není určen. |
| [Q-NAS-05](#q-nas-05) | Jaká pole veřejných údajů o akci (fotografie atd.) se mají zobrazovat na veřejné stránce? | [US-22](https://github.com/applifting-vsecourse/team-1/issues/22) | P1 | Veřejná stránka akce je v návrhu PO pro sprint 3 (návštěvník webu) a seznam polí není určen. |
| [Q-NAS-07](#q-nas-07) | Přidají se zkopírované pokoje k existujícím pokojům cílového termínu, nebo je nahradí? | [US-100](https://github.com/applifting-vsecourse/team-1/issues/193), [US-99](https://github.com/applifting-vsecourse/team-1/issues/192) | P1 | US-100 je ve sprintu 3 a bez odpovědi nejde implementovat kopírování pokojů. |
| [Q-PLA-10](#q-pla-10) | Co s už zapsanými platbami a už vydanými variabilními symboly (migrace, nebo přepsání seedu)? | [#174](https://github.com/applifting-vsecourse/team-1/issues/174) | P1 | Rozpracovaný ticket o platbě v termínu; kód se bez odpovědí nedomýšlí a PO 28. 10. platbu v termínu výslovně chtěl. |
| [Q-PLA-11](#q-pla-11) | K jaké přihlášce v termínu patří přeplatek a co se stane s platbou zrušeného termínu nebo náhradníka? | [#174](https://github.com/applifting-vsecourse/team-1/issues/174) | P1 | Rozpracovaný ticket o platbě v termínu; kód se bez odpovědí nedomýšlí a PO 28. 10. platbu v termínu výslovně chtěl. |
| [Q-PLA-12](#q-pla-12) | Patří editace a doplnění platby do tohoto ticketu (dnes US-44 umí zápis a zrušení, ne úpravu)? | [#174](https://github.com/applifting-vsecourse/team-1/issues/174), [US-44](https://github.com/applifting-vsecourse/team-1/issues/44) | P1 | Rozpracovaný ticket o platbě v termínu; kód se bez odpovědí nedomýšlí a PO 28. 10. platbu v termínu výslovně chtěl. |
| [Q-PLA-13](#q-pla-13) | Je ticket o platbě v termínu zařazen do dalšího sprintu? | [#174](https://github.com/applifting-vsecourse/team-1/issues/174) | P1 | Rozpracovaný ticket o platbě v termínu; kód se bez odpovědí nedomýšlí a PO 28. 10. platbu v termínu výslovně chtěl. |
| [Q-PRE-01](#q-pre-01) | Má administrace otevírat poslední akci, se kterou organizátor pracoval? | [US-51](https://github.com/applifting-vsecourse/team-1/issues/51) | P1 | Dashboard se vrací a je v návrhu PO; obsah karet není určen. |
| [Q-PRE-02](#q-pre-02) | Dashboard organizátora: jaký přesně obsah mají karty „co vyžaduje pozornost“? | [US-51](https://github.com/applifting-vsecourse/team-1/issues/51) | P1 | Dashboard se vrací a je v návrhu PO; obsah karet není určen. |
| [Q-PRI-02](#q-pri-02) | Jaká lhůta na zaplacení platí pro náhradníka potvrzeného na poslední chvíli, např. týden před akcí? | [US-31](https://github.com/applifting-vsecourse/team-1/issues/31) | P1 | Vyhodnocování a náhradníci jsou hlavní priorita PO; lhůta pro náhradníka na poslední chvíli není určena. |
| [Q-PRI-03](#q-pri-03) | Platí pro změnu termínu stejné storno podmínky jako pro odhlášku (US-47)? | [US-32](https://github.com/applifting-vsecourse/team-1/issues/32) | P1 | Odhláška a změna termínu jsou v návrhu PO; pravidla stornování nejsou určena. |
| [Q-PRI-07](#q-pri-07) | Má změna termínu nebo odhláška proběhnout hned, nebo ji organizátor nejdřív schválí (kvůli kapacitě a storno podmínkám)? | [US-84](https://github.com/applifting-vsecourse/team-1/issues/84) | P1 | Účastník si sám mění termín a odhlašuje se (návrh PO); chybí pravidlo hned / po schválení. |
| [Q-UCT-04](#q-uct-04) | Organizace: musí ji mít každý organizátor, nebo může pořádat akce sám? | [US-08](https://github.com/applifting-vsecourse/team-1/issues/8) | P1 | Self-onboarding organizace je v rozsahu sprintu 3; otázka určuje dopad na model a UX. |
| [Q-BEZ-05](#q-bez-05) | Kde a jak dlouho smí formulář přihlášky držet osobní údaje (i dětí) v prohlížeči a jak se uloží formulář s více účastníky? | [#179](https://github.com/applifting-vsecourse/team-1/issues/179) | P2 | Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí. |
| [Q-KOM-08](#q-kom-08) | Má se User.locale aktualizovat s každou přihláškou nebo přepnutím jazyka? | [#183](https://github.com/applifting-vsecourse/team-1/issues/183) | P2 | Žádný zdroj to neurčuje; reset hesla a ověření e-mailu u účtu založeného anglicky zůstávají anglicky. |
| [Q-KOM-10](#q-kom-10) | Kdo dodá text a vzhled e-mailu č. 6 („zrušeno, protože se neuvolnilo lůžko“)? | [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) | P2 | Ve Figmě rámec není; text je zatím věta z kritérií. |
| [Q-PLA-02](#q-pla-02) | Stačí nahrání výpisu, nebo čekáte, že si systém platby načte z bankovního účtu sám? U které banky máte bankovní účet a můžete nám k němu zřídit přístup pro čtení? Blokuje ready. | [US-43](https://github.com/applifting-vsecourse/team-1/issues/43) | P2 | Označeno jako klíčové a blokující, ale board říká „platby bez banky“ a US je „Později“. |
| [Q-PLA-04](#q-pla-04) | Jak se počítá storno při odhlášce méně než 30 dní před akcí: procento z ceny, pevná částka, nebo podle toho, jestli se za účastníka najde náhradník? | [US-47](https://github.com/applifting-vsecourse/team-1/issues/47) | P2 | Storno podmínky jsou v návrhu PO („odkdy běží“), výpočet storna ale není určen. |
| [Q-PLT-02](#q-plt-02) | Kdy reálně přijde druhá organizace? Chcete nové organizace schvalovat? | [US-69](https://github.com/applifting-vsecourse/team-1/issues/69) | P2 | Souvisí s self-onboardingem organizace (sprint 3) a otevřeným bodem o povinné organizaci. |
| [Q-PRI-04](#q-pri-04) | Platí pravidlo „odhlášená přihláška se nepočítá do kontroly duplicity“ i pro termín zrušený organizátorem při vyhodnocení (stav „Zrušená“)? | [US-32](https://github.com/applifting-vsecourse/team-1/issues/32), [#160](https://github.com/applifting-vsecourse/team-1/issues/160) | P2 | Drobné pravidlo kontroly duplicity; autor navrhuje odpověď „ano“. |
| [Q-PRI-11](#q-pri-11) | Má se formát data narození řídit jazykem aplikace, nebo jazykem systému (a co na jiných zařízeních)? | [#177](https://github.com/applifting-vsecourse/team-1/issues/177) | P2 | Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí. |
| [Q-PRI-12](#q-pri-12) | Je v angličtině správný formát data narození DD/MM/YYYY (en-GB), nebo MM/DD/YYYY? | [#177](https://github.com/applifting-vsecourse/team-1/issues/177) | P2 | Otevřené PR #226 staví en-GB; čeká na potvrzení. |
| [Q-UBY-01](#q-uby-01) | Brief uvádí rozdělení do pokojů mezi nutnostmi pro 7. 2., v rozhovoru ale pokoje řešíte na místě. Platí tedy Nice to have? | [US-35](https://github.com/applifting-vsecourse/team-1/issues/35) | P2 | PO chce interaktivní prvek u kapacit ubytování; samotné přiřazování na lůžka je ale označeno jako nice to have. |
| [Q-UCT-01](#q-uct-01) | Mají e-maily chodit i samotnému účastníkovi, nebo jen přihlašovateli? Navrhujeme oběma. | [US-05](https://github.com/applifting-vsecourse/team-1/issues/5) | P2 | Zbývající flow přihlášky; otázka, komu chodí e-maily. |
| [Q-UCT-02](#q-uct-02) | Od kolika let může účastník podat přihlášku sám? Platí to pro všechny akce stejně, nebo si to nastaví organizátor? | [US-07](https://github.com/applifting-vsecourse/team-1/issues/7) | P2 | Zbývající flow přihlášky; hranice věku pro samostatnou přihlášku. |
| [Q-UCT-07](#q-uct-07) | Má nový magic link zneplatnit jen dříve vydané nepoužité odkazy, nebo i aktivní session? | [#127](https://github.com/applifting-vsecourse/team-1/issues/127) | P2 | Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí. |
| [Q-UCT-08](#q-uct-08) | Je pro klienta v pořádku, že obecná chybová hláška loginu zůstává bez nápovědy, jen s radou zkontrolovat e-mail z přihlášky? | [#187](https://github.com/applifting-vsecourse/team-1/issues/187) | P2 | Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí. |
| [Q-UCT-09](#q-uct-09) | Mají se v textech důsledně používat slova „přihlašovatel“ a „účastník“ podle slovníku, i když rodič rozdíl nepozná? | [#187](https://github.com/applifting-vsecourse/team-1/issues/187) | P2 | Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí. |
| [Q-BEZ-01](#q-bez-01) | Jaké doklady zaměstnavatelé skutečně vyžadují a kdy a kým se mají vystavovat? | [#162](https://github.com/applifting-vsecourse/team-1/issues/162) | P3 | Nápad (label idea), není ve storkách ani v rozsahu sprintu. |
| [Q-BEZ-02](#q-bez-02) | Jaké doklady vyžadují zdravotní pojišťovny a liší se od dokladů pro zaměstnavatele (#162)? | [#163](https://github.com/applifting-vsecourse/team-1/issues/163) | P3 | Nápad (label idea), není ve storkách ani v rozsahu sprintu. |
| [Q-BEZ-03](#q-bez-03) | Kdo smí které zdravotní údaje vidět a zapisovat, jaké zákonné požadavky platí a má se to řešit jako jeden modul? | [#166](https://github.com/applifting-vsecourse/team-1/issues/166) | P3 | Nápad (label idea), není ve storkách ani v rozsahu sprintu. |
| [Q-EKO-01](#q-eko-01) | Stačí ti přehled za celou akci, nebo ho potřebuješ i po termínech? | [US-59](https://github.com/applifting-vsecourse/team-1/issues/59) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-EKO-02](#q-eko-02) | Které proměnné chceš měnit (počet lidí, cena, náklady)? Kdy v roce se takhle rozhodujete? | [US-61](https://github.com/applifting-vsecourse/team-1/issues/61) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-KOM-01](#q-kom-01) | Potřebuješ to už pro první ročník (MVP), nebo zatím stačí Mailchimp? | [US-57](https://github.com/applifting-vsecourse/team-1/issues/57) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-KOM-02](#q-kom-02) | Má být už v MVP, nebo stačí po spuštění přihlášek? | [US-58](https://github.com/applifting-vsecourse/team-1/issues/58) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-KOM-03](#q-kom-03) | Stačí zvoneček v aplikaci a e-mail jako volba? | [US-86](https://github.com/applifting-vsecourse/team-1/issues/86) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-KOM-04](#q-kom-04) | Mají účastníci dostat upozornění, když se na nástěnce objeví něco nového? Je to MVP, nebo Nice to have? | [US-91](https://github.com/applifting-vsecourse/team-1/issues/91) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-KOM-05](#q-kom-05) | Pro které typy akcí to dává smysl? | [US-92](https://github.com/applifting-vsecourse/team-1/issues/92) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-LOG-01](#q-log-01) | Které další dokumenty kromě bezinfekčnosti od účastníků potřebuješ? | [US-62](https://github.com/applifting-vsecourse/team-1/issues/62) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-LOG-02](#q-log-02) | Jaké varianty nabízíš a kdy potřebuje kuchyně počty? | [US-64](https://github.com/applifting-vsecourse/team-1/issues/64) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-LOG-03](#q-log-03) | Hlídá se kapacita autobusu? Je doprava v ceně, nebo je vlastní doprava sleva (US-49)? | [US-65](https://github.com/applifting-vsecourse/team-1/issues/65) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-LOG-04](#q-log-04) | Stačí pro začátek jen harmonogram pro všechny? Mají mít volitelné bloky omezenou kapacitu? | [US-66](https://github.com/applifting-vsecourse/team-1/issues/66) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-LOG-05](#q-log-05) | Kdo z týmu je smí vidět (jen zdravotník?) a jak dlouho se po akci uchovávají? | [US-68](https://github.com/applifting-vsecourse/team-1/issues/68) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-LOG-07](#q-log-07) | Souhlasíš, že je řešíme až nakonec, případně napojením na externí služby? | [US-95](https://github.com/applifting-vsecourse/team-1/issues/95) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-NAS-01](#q-nas-01) | Vyhovuje to tak pro všechny akce, nebo má mít organizátor možnost přihlášky po naplnění úplně zavřít? | [US-18](https://github.com/applifting-vsecourse/team-1/issues/18) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-NAS-02](#q-nas-02) | Jaké typy otázek potřebuješ? Má jít podrobný formulář přihlášky uložit jako šablonu pro další akce? Je to spíš MVP, nebo Nice to have? | [US-19](https://github.com/applifting-vsecourse/team-1/issues/19) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-NAS-03](#q-nas-03) | Stačí kopie celé akce, nebo chceš areál a formulář spravovat zvlášť (US-81)? Je to spíš MVP, nebo Nice to have? | [US-21](https://github.com/applifting-vsecourse/team-1/issues/21) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-NAS-06](#q-nas-06) | Stačí kopie celé akce, nebo chceš areál a formulář spravovat zvlášť a vybírat je při zakládání akce? **Duplicita s [Q-NAS-03](#q-nas-03).** | [US-81](https://github.com/applifting-vsecourse/team-1/issues/81) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLA-03](#q-pla-03) | Co po poslední výzvě k zaplacení bez reakce: jen označit pro telefonát (US-45), nebo má systém přihlášku po nějaké době sám zrušit? | [US-46](https://github.com/applifting-vsecourse/team-1/issues/46) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLA-05](#q-pla-05) | Doúčtovává pořadatel po akci? Rozpočítání výdaje mezi účastníky je samostatná otázka. | [US-48](https://github.com/applifting-vsecourse/team-1/issues/48) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLA-06](#q-pla-06) | Kdo ověří nárok na slevu (např. členství ve spolku)? | [US-49](https://github.com/applifting-vsecourse/team-1/issues/49) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLA-07](#q-pla-07) | Má pořadatel účastníky ze zahraničí? | [US-50](https://github.com/applifting-vsecourse/team-1/issues/50) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLA-08](#q-pla-08) | Má systém organizátora upozornit hned po první zmeškané splátce? | [US-89](https://github.com/applifting-vsecourse/team-1/issues/89) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLA-09](#q-pla-09) | Jaké příplatky nabízíš? Vybírají se v přihlášce, nebo až po potvrzení? | [US-90](https://github.com/applifting-vsecourse/team-1/issues/90) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLT-01](#q-plt-01) | Které části má mít každá akce vždy (přihláška, platby) a které si má organizátor zapínat podle potřeby? | [US-20](https://github.com/applifting-vsecourse/team-1/issues/20) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLT-03](#q-plt-03) | Je v pořádku, že první ročník běží bez účtování, nebo je to nutnost? | [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PLT-06](#q-plt-06) | Kdo je smluvní stranou vůči přihlašovateli: organizace, nebo provozovatel Togeny? (Souvisí s otázkou správce údajů v #164.) | [US-98](https://github.com/applifting-vsecourse/team-1/issues/167) | P3 | GDPR má podle PO 28. 10. nízkou prioritu. |
| [Q-PLT-07](#q-plt-07) | Co patří do admin portálu platformy kromě náhledu organizací a fakturace (deaktivace, audit log, statistiky, podpora)? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186) | P3 | Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.). |
| [Q-PLT-08](#q-plt-08) | Má se organizacím jen vyúčtovat (přehled k ruční fakturaci, jak říká US-70), nebo má platforma faktury vystavovat a evidovat jejich úhradu? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) | P3 | Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.). |
| [Q-PLT-09](#q-plt-09) | Jaký je obchodní model: poplatek za účastníka, předplatné, nebo obojí? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) | P3 | Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.). |
| [Q-PLT-10](#q-plt-10) | Jak se řeší odběratel a plátce, tedy fakturační údaje organizace (IČO, adresa, DPH)? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186) | P3 | Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.). |
| [Q-PLT-11](#q-plt-11) | Kdy reálně přijde druhá organizace (určuje, zda je portál potřeba pro první ročník)? **Duplicita s [Q-PLT-02](#q-plt-02).** | [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-69](https://github.com/applifting-vsecourse/team-1/issues/69) | P3 | Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.). |
| [Q-PLT-12](#q-plt-12) | Smí správce platformy vidět osobní údaje účastníků, nebo jen agregáty? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186) | P3 | Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.). |
| [Q-PRE-03](#q-pre-03) | Které sestavy tiskneš nejčastěji kromě seznamu do autobusu? | [US-55](https://github.com/applifting-vsecourse/team-1/issues/55) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PRE-04](#q-pre-04) | Stačí pamatovat filtry seznamu přihlášek jen v rámci session, nebo mají přežít zavření prohlížeče? | [#175](https://github.com/applifting-vsecourse/team-1/issues/175) | P3 | Zápis 27. 10.: do backlogu. |
| [Q-PRI-01](#q-pri-01) | Jaké výjimky dnes děláš (stálí účastníci, tým, sourozenci)? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | P3 | PM 31. 10.: otázka není prioritní a nebrání mergi #232. |
| [Q-PRI-09](#q-pri-09) | Používáš okna pro podání přihlášek podle věku či jiných údajů? | [US-87](https://github.com/applifting-vsecourse/team-1/issues/87) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-PRI-10](#q-pri-10) | Kdo je smí vidět, jak dlouho se uchovávají a má o záznamu účastník vědět? Potřebuješ to na kempu? | [US-88](https://github.com/applifting-vsecourse/team-1/issues/88) | P3 | GDPR má podle PO 28. 10. nízkou prioritu. |
| [Q-PRI-13](#q-pri-13) | Má u náhradníka na detailu přihlášky zůstat text „0 Kč do potvrzení“, nebo se změnit (např. „zatím nic k úhradě“)? | [#225](https://github.com/applifting-vsecourse/team-1/issues/225) | P3 | Drobný text; PR #227 ho nechal beze změny. |
| [Q-TEC-01](#q-tec-01) | Kolik lidí loni podalo přihlášku v první hodině? Jak předejít selhání systému ten večer? | [US-74](https://github.com/applifting-vsecourse/team-1/issues/74) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-TEC-02](#q-tec-02) | Jakou ztrátu dat je PO ochoten unést (hodina, den)? | [US-76](https://github.com/applifting-vsecourse/team-1/issues/76) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-TEC-03](#q-tec-03) | Jak dlouho se údaje po akci uchovávají? Viz #164. | [US-78](https://github.com/applifting-vsecourse/team-1/issues/78) | P3 | GDPR má podle PO 28. 10. nízkou prioritu. |
| [Q-TEC-04](#q-tec-04) | Potřebuješ do systému stará data, nebo ročník 2027 začne načisto? | [US-85](https://github.com/applifting-vsecourse/team-1/issues/85) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-UBY-02](#q-uby-02) | Je ještě jiné pravidlo, které má systém hlídat? | [US-37](https://github.com/applifting-vsecourse/team-1/issues/37) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-UBY-03](#q-uby-03) | Mají být zájmena v přihlášce jako nepovinné pole? Organizátor LARP tábora je plánuje do přihlášek přidat. | [US-38](https://github.com/applifting-vsecourse/team-1/issues/38) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-UBY-04](#q-uby-04) | Necháme to až po rozdělení do pokojů (US-35)? | [US-39](https://github.com/applifting-vsecourse/team-1/issues/39) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-UCT-05](#q-uct-05) | Potřebují lidé v administraci rozdílná oprávnění (např. pokladník jen platby), nebo pro začátek stačí, že všichni vidí všechno? | [US-11](https://github.com/applifting-vsecourse/team-1/issues/11) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |
| [Q-UCT-06](#q-uct-06) | Zabírají členové organizačního týmu lůžka v kapacitě akce? Platí za účast? | [US-93](https://github.com/applifting-vsecourse/team-1/issues/93) | P3 | Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí. |

### `tech-lead` (Honza): 5

| ID | Otázka | Dotčené US | Priorita | Proč |
| --- | --- | --- | --- | --- |
| [Q-KOM-09](#q-kom-09) | Který text e-mailu platí: „Jste náhradník“ (EMAILY.md), nebo „čeká na potvrzení“ (stávající šablona)? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | P2 | PM: platí EMAILY.md, ale potřebuje vědět, o jaký e-mail (#) jde; po upřesnění rozhodne. |
| [Q-NAS-13](#q-nas-13) | Slovník říká „Režim vyhodnocení“, Figma „Režim vyhodnocování“. Která varianta platí? | [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) | P3 | PR #238 použilo Figmu; rozhodne tech lead, zda se mění slovník, nebo design. |
| [Q-TEC-05](#q-tec-05) | Přejmenovat typ účtu `PARTICIPANT` na `APPLICANT`? | – | P3 | Rozpor mezi zdroji ve SLOVNIK.md; rozhodnout s tech leadem. |
| [Q-TEC-06](#q-tec-06) | Připojit Figma konektor a převzít tokeny do `global.css`. | – | P3 | Otevřený bod v PROJEKT.md §12; vlastník je tech lead. |
| [Q-TEC-07](#q-tec-07) | Dopad zneplatnění magic linků na E2E (`magic-link.spec.ts`, `set-password.spec.ts`) a zápis pravidla do PROJEKT.md. | [#127](https://github.com/applifting-vsecourse/team-1/issues/127) | P3 | Navazuje na #127; technická část, nejde o rozhodnutí PM. |

### `design` (Kuba): 2

| ID | Otázka | Dotčené US | Priorita | Proč |
| --- | --- | --- | --- | --- |
| [Q-NAS-10](#q-nas-10) | Chybí mobilní rámec (360 px) pořadníku ve Figmě. Kdo ho dodá? | [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) | P2 | Mobil staví na existující kartě seznamu přihlášek bez vlastního rámce. |
| [Q-NAS-14](#q-nas-14) | Která sada textů nastavení režimu platí: desktopový, nebo mobilní rámec (jiné podnadpisy, nápověda, tlačítko)? | [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) | P3 | Rámce se v textech liší; PR #238 použilo desktopové pro obě šířky. |

### `qa` (Petr): 0

_Nic._

### `po` (Tomáš): 0

_Nic._

## Rozhodnuto, ale nezapsáno v dokumentaci

| ID | Otázka | Dotčené US | Rozhodnutí | Zapsat do |
| --- | --- | --- | --- | --- |
| [Q-KOM-07](#q-kom-07) | Podle čeho se má volit jazyk samostatného magic link e-mailu: UI v okamžiku žádosti, User.locale, nebo jazyk poslední přihlášky? | [#183](https://github.com/applifting-vsecourse/team-1/issues/183) | Jazyk magic link e-mailu je jazyk UI v okamžiku žádosti (varianta a z #183); chybí-li, použije se en. | `docs/PROJEKT.md`, `docs/procesy/zpracovani-prihlasky/EMAILY.md` |
| [Q-PRI-14](#q-pri-14) | Má se do diagramu doplnit přechod Potvrzená → Náhradník (organizátor), jak říká ticket US-28? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | Ano, systém to má umožnit. | `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`, `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`, `docs/procesy/zpracovani-prihlasky/EMAILY.md` |
| [Q-PRI-15](#q-pri-15) | Smí organizátor zrušit náhradníka kdykoli, nebo jen automaticky první den termínu? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | Je v pořádku, organizátor může zrušit náhradníka kdykoli. | `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`, `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`, `docs/procesy/zpracovani-prihlasky/EMAILY.md` |
| [Q-NAS-08](#q-nas-08) | Sedí, že pořadník vychází z termínu a režimu pokojů celé akce, nebo se má režim pokojů lišit po termínech? | [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) | Systém má umožnit odlišný režim pokojů v odlišných termínech. „Implementováno“ v #80 znamená, že to řeší odkazovaný ticket, ne že je hotovo; pravdu říká stav #192 (US-99). | `docs/PROJEKT.md` |
| [Q-NAS-09](#q-nas-09) | Je ve společných pokojích pořadí náhradníků jedno pro obě pohlaví v rámci termínu? | [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) | Ano; pokud pokoj nemá dané pohlaví, je fronta přihlášek jedna pro obě pohlaví. | `docs/procesy/zpracovani-prihlasky/` |
| [Q-PRI-20](#q-pri-20) | Od jaké hodiny se ruší náhradník první den termínu? | [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) | Zatím půlnoc českého času; platforma zatím není mezinárodní. Detaily procesu zjistí PM od PO, případně vznikne ticket enhancement. | `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`, `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml` |
| [Q-PRI-21](#q-pri-21) | Co se stane s náhradníky (a ostatními přihláškami) ve zrušeném termínu akce? | [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) | Při zrušení termínu se ruší všichni účastníci ve všech stavech. UX má organizátora dostatečně upozornit na kritickou a nevratnou akci. | `docs/procesy/zpracovani-prihlasky/`, `docs/procesy/zpracovani-prihlasky/EMAILY.md` |
| [Q-NAS-11](#q-nas-11) | Co přesně je „otevření přihlášek“, od kterého se zamyká režim vyhodnocování? | [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) | Aktuálně moment, kdy akce splní všechny požadavky (termín, ubytování atd.); pak se vygeneruje link a přihlašování se spustí. V budoucnu ruční nebo plánované spuštění a ruční pozastavení přihlášek (např. při výpadku ubytování). | `docs/PROJEKT.md` |

## Tickety k založení

| Z otázky | Ticket |
| --- | --- |
| [Q-PRI-18](#q-pri-18) | enhancement: UI/UX bloku „Stav v termínech“ + rámce ve Figmě |
| [Q-PRI-19](#q-pri-19) | nový ticket: sběr telefonů od účastníků (+ tel: odkaz v pořadníku) |
| [Q-PRI-20](#q-pri-20) | zjistit od PO detaily rušení náhradníků; případně enhancement |
| [Q-PRI-21](#q-pri-21) | story: zrušení termínu zruší všechny přihlášky ve všech stavech + varování v UX |
| [Q-NAS-11](#q-nas-11) | ruční nebo plánované spuštění přihlášek |
| [Q-NAS-11](#q-nas-11) | ruční pozastavení přihlášek |
| [Q-NAS-12](#q-nas-12) | změna režimu vyhodnocování do první přihlášky (nebo kombinace) |

## Podle epiců

### Epic: bez epicu

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-BEZ-04](#q-bez-04) | Má být magic link i v e-mailu o změně přihlášky a v jakých případech e-mail magic link neobsahoval? | [#178](https://github.com/applifting-vsecourse/team-1/issues/178) | otevřeno | P1 | `pm` |
| [Q-BEZ-05](#q-bez-05) | Kde a jak dlouho smí formulář přihlášky držet osobní údaje (i dětí) v prohlížeči a jak se uloží formulář s více účastníky? | [#179](https://github.com/applifting-vsecourse/team-1/issues/179) | otevřeno | P2 | `pm` |
| [Q-BEZ-01](#q-bez-01) | Jaké doklady zaměstnavatelé skutečně vyžadují a kdy a kým se mají vystavovat? | [#162](https://github.com/applifting-vsecourse/team-1/issues/162) | otevřeno | P3 | `pm` |
| [Q-BEZ-02](#q-bez-02) | Jaké doklady vyžadují zdravotní pojišťovny a liší se od dokladů pro zaměstnavatele (#162)? | [#163](https://github.com/applifting-vsecourse/team-1/issues/163) | otevřeno | P3 | `pm` |
| [Q-BEZ-03](#q-bez-03) | Kdo smí které zdravotní údaje vidět a zapisovat, jaké zákonné požadavky platí a má se to řešit jako jeden modul? | [#166](https://github.com/applifting-vsecourse/team-1/issues/166) | otevřeno | P3 | `pm` |

### Epic: ekonomika

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-EKO-01](#q-eko-01) | Stačí ti přehled za celou akci, nebo ho potřebuješ i po termínech? | [US-59](https://github.com/applifting-vsecourse/team-1/issues/59) | otevřeno | P3 | `pm` |
| [Q-EKO-02](#q-eko-02) | Které proměnné chceš měnit (počet lidí, cena, náklady)? Kdy v roce se takhle rozhodujete? | [US-61](https://github.com/applifting-vsecourse/team-1/issues/61) | otevřeno | P3 | `pm` |

### Epic: komunikace

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-KOM-06](#q-kom-06) | Který e-mail dorazil anglicky a v jakém jazyce byl UI při odeslání přihlášky a při žádosti o odkaz? | [#183](https://github.com/applifting-vsecourse/team-1/issues/183) | otevřeno | P1 | `pm` |
| [Q-KOM-07](#q-kom-07) | Podle čeho se má volit jazyk samostatného magic link e-mailu: UI v okamžiku žádosti, User.locale, nebo jazyk poslední přihlášky? | [#183](https://github.com/applifting-vsecourse/team-1/issues/183) | rozhodnuto, nezapsáno | P1 | `pm` |
| [Q-KOM-08](#q-kom-08) | Má se User.locale aktualizovat s každou přihláškou nebo přepnutím jazyka? | [#183](https://github.com/applifting-vsecourse/team-1/issues/183) | otevřeno | P2 | `pm` |
| [Q-KOM-09](#q-kom-09) | Který text e-mailu platí: „Jste náhradník“ (EMAILY.md), nebo „čeká na potvrzení“ (stávající šablona)? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | otevřeno | P2 | `tech-lead` |
| [Q-KOM-10](#q-kom-10) | Kdo dodá text a vzhled e-mailu č. 6 („zrušeno, protože se neuvolnilo lůžko“)? | [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) | otevřeno | P2 | `pm` |
| [Q-KOM-01](#q-kom-01) | Potřebuješ to už pro první ročník (MVP), nebo zatím stačí Mailchimp? | [US-57](https://github.com/applifting-vsecourse/team-1/issues/57) | otevřeno | P3 | `pm` |
| [Q-KOM-02](#q-kom-02) | Má být už v MVP, nebo stačí po spuštění přihlášek? | [US-58](https://github.com/applifting-vsecourse/team-1/issues/58) | otevřeno | P3 | `pm` |
| [Q-KOM-03](#q-kom-03) | Stačí zvoneček v aplikaci a e-mail jako volba? | [US-86](https://github.com/applifting-vsecourse/team-1/issues/86) | otevřeno | P3 | `pm` |
| [Q-KOM-04](#q-kom-04) | Mají účastníci dostat upozornění, když se na nástěnce objeví něco nového? Je to MVP, nebo Nice to have? | [US-91](https://github.com/applifting-vsecourse/team-1/issues/91) | otevřeno | P3 | `pm` |
| [Q-KOM-05](#q-kom-05) | Pro které typy akcí to dává smysl? | [US-92](https://github.com/applifting-vsecourse/team-1/issues/92) | otevřeno | P3 | `pm` |

### Epic: logistika

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-LOG-01](#q-log-01) | Které další dokumenty kromě bezinfekčnosti od účastníků potřebuješ? | [US-62](https://github.com/applifting-vsecourse/team-1/issues/62) | otevřeno | P3 | `pm` |
| [Q-LOG-02](#q-log-02) | Jaké varianty nabízíš a kdy potřebuje kuchyně počty? | [US-64](https://github.com/applifting-vsecourse/team-1/issues/64) | otevřeno | P3 | `pm` |
| [Q-LOG-03](#q-log-03) | Hlídá se kapacita autobusu? Je doprava v ceně, nebo je vlastní doprava sleva (US-49)? | [US-65](https://github.com/applifting-vsecourse/team-1/issues/65) | otevřeno | P3 | `pm` |
| [Q-LOG-04](#q-log-04) | Stačí pro začátek jen harmonogram pro všechny? Mají mít volitelné bloky omezenou kapacitu? | [US-66](https://github.com/applifting-vsecourse/team-1/issues/66) | otevřeno | P3 | `pm` |
| [Q-LOG-05](#q-log-05) | Kdo z týmu je smí vidět (jen zdravotník?) a jak dlouho se po akci uchovávají? | [US-68](https://github.com/applifting-vsecourse/team-1/issues/68) | otevřeno | P3 | `pm` |
| [Q-LOG-07](#q-log-07) | Souhlasíš, že je řešíme až nakonec, případně napojením na externí služby? | [US-95](https://github.com/applifting-vsecourse/team-1/issues/95) | otevřeno | P3 | `pm` |

### Epic: nastavení akce

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-NAS-04](#q-nas-04) | Co všechno má přihlašovatel o akci vidět, než podá přihlášku? Má být stránka dostupná komukoliv, nebo jen přes odkaz od organizátora? | [US-22](https://github.com/applifting-vsecourse/team-1/issues/22) | otevřeno | P1 | `pm` |
| [Q-NAS-05](#q-nas-05) | Jaká pole veřejných údajů o akci (fotografie atd.) se mají zobrazovat na veřejné stránce? | [US-22](https://github.com/applifting-vsecourse/team-1/issues/22) | otevřeno | P1 | `pm` |
| [Q-NAS-07](#q-nas-07) | Přidají se zkopírované pokoje k existujícím pokojům cílového termínu, nebo je nahradí? | [US-100](https://github.com/applifting-vsecourse/team-1/issues/193), [US-99](https://github.com/applifting-vsecourse/team-1/issues/192) | otevřeno | P1 | `pm` |
| [Q-NAS-08](#q-nas-08) | Sedí, že pořadník vychází z termínu a režimu pokojů celé akce, nebo se má režim pokojů lišit po termínech? | [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) | rozhodnuto, nezapsáno | P1 | `pm` |
| [Q-NAS-11](#q-nas-11) | Co přesně je „otevření přihlášek“, od kterého se zamyká režim vyhodnocování? | [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) | rozhodnuto, nezapsáno | P1 | `pm` |
| [Q-NAS-09](#q-nas-09) | Je ve společných pokojích pořadí náhradníků jedno pro obě pohlaví v rámci termínu? | [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) | rozhodnuto, nezapsáno | P2 | `pm` |
| [Q-NAS-10](#q-nas-10) | Chybí mobilní rámec (360 px) pořadníku ve Figmě. Kdo ho dodá? | [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) | otevřeno | P2 | `design` |
| [Q-NAS-01](#q-nas-01) | Vyhovuje to tak pro všechny akce, nebo má mít organizátor možnost přihlášky po naplnění úplně zavřít? | [US-18](https://github.com/applifting-vsecourse/team-1/issues/18) | otevřeno | P3 | `pm` |
| [Q-NAS-02](#q-nas-02) | Jaké typy otázek potřebuješ? Má jít podrobný formulář přihlášky uložit jako šablonu pro další akce? Je to spíš MVP, nebo Nice to have? | [US-19](https://github.com/applifting-vsecourse/team-1/issues/19) | otevřeno | P3 | `pm` |
| [Q-NAS-03](#q-nas-03) | Stačí kopie celé akce, nebo chceš areál a formulář spravovat zvlášť (US-81)? Je to spíš MVP, nebo Nice to have? | [US-21](https://github.com/applifting-vsecourse/team-1/issues/21) | otevřeno | P3 | `pm` |
| [Q-NAS-06](#q-nas-06) | Stačí kopie celé akce, nebo chceš areál a formulář spravovat zvlášť a vybírat je při zakládání akce? **Duplicita s [Q-NAS-03](#q-nas-03).** | [US-81](https://github.com/applifting-vsecourse/team-1/issues/81) | otevřeno | P3 | `pm` |
| [Q-NAS-13](#q-nas-13) | Slovník říká „Režim vyhodnocení“, Figma „Režim vyhodnocování“. Která varianta platí? | [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) | otevřeno | P3 | `tech-lead` |
| [Q-NAS-14](#q-nas-14) | Která sada textů nastavení režimu platí: desktopový, nebo mobilní rámec (jiné podnadpisy, nápověda, tlačítko)? | [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) | otevřeno | P3 | `design` |

### Epic: platby

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-PLA-10](#q-pla-10) | Co s už zapsanými platbami a už vydanými variabilními symboly (migrace, nebo přepsání seedu)? | [#174](https://github.com/applifting-vsecourse/team-1/issues/174) | otevřeno | P1 | `pm` |
| [Q-PLA-11](#q-pla-11) | K jaké přihlášce v termínu patří přeplatek a co se stane s platbou zrušeného termínu nebo náhradníka? | [#174](https://github.com/applifting-vsecourse/team-1/issues/174) | otevřeno | P1 | `pm` |
| [Q-PLA-12](#q-pla-12) | Patří editace a doplnění platby do tohoto ticketu (dnes US-44 umí zápis a zrušení, ne úpravu)? | [#174](https://github.com/applifting-vsecourse/team-1/issues/174), [US-44](https://github.com/applifting-vsecourse/team-1/issues/44) | otevřeno | P1 | `pm` |
| [Q-PLA-13](#q-pla-13) | Je ticket o platbě v termínu zařazen do dalšího sprintu? | [#174](https://github.com/applifting-vsecourse/team-1/issues/174) | otevřeno | P1 | `pm` |
| [Q-PLA-02](#q-pla-02) | Stačí nahrání výpisu, nebo čekáte, že si systém platby načte z bankovního účtu sám? U které banky máte bankovní účet a můžete nám k němu zřídit přístup pro čtení? Blokuje ready. | [US-43](https://github.com/applifting-vsecourse/team-1/issues/43) | otevřeno | P2 | `pm` |
| [Q-PLA-04](#q-pla-04) | Jak se počítá storno při odhlášce méně než 30 dní před akcí: procento z ceny, pevná částka, nebo podle toho, jestli se za účastníka najde náhradník? | [US-47](https://github.com/applifting-vsecourse/team-1/issues/47) | otevřeno | P2 | `pm` |
| [Q-PLA-03](#q-pla-03) | Co po poslední výzvě k zaplacení bez reakce: jen označit pro telefonát (US-45), nebo má systém přihlášku po nějaké době sám zrušit? | [US-46](https://github.com/applifting-vsecourse/team-1/issues/46) | otevřeno | P3 | `pm` |
| [Q-PLA-05](#q-pla-05) | Doúčtovává pořadatel po akci? Rozpočítání výdaje mezi účastníky je samostatná otázka. | [US-48](https://github.com/applifting-vsecourse/team-1/issues/48) | otevřeno | P3 | `pm` |
| [Q-PLA-06](#q-pla-06) | Kdo ověří nárok na slevu (např. členství ve spolku)? | [US-49](https://github.com/applifting-vsecourse/team-1/issues/49) | otevřeno | P3 | `pm` |
| [Q-PLA-07](#q-pla-07) | Má pořadatel účastníky ze zahraničí? | [US-50](https://github.com/applifting-vsecourse/team-1/issues/50) | otevřeno | P3 | `pm` |
| [Q-PLA-08](#q-pla-08) | Má systém organizátora upozornit hned po první zmeškané splátce? | [US-89](https://github.com/applifting-vsecourse/team-1/issues/89) | otevřeno | P3 | `pm` |
| [Q-PLA-09](#q-pla-09) | Jaké příplatky nabízíš? Vybírají se v přihlášce, nebo až po potvrzení? | [US-90](https://github.com/applifting-vsecourse/team-1/issues/90) | otevřeno | P3 | `pm` |

### Epic: platforma

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-PLT-02](#q-plt-02) | Kdy reálně přijde druhá organizace? Chcete nové organizace schvalovat? | [US-69](https://github.com/applifting-vsecourse/team-1/issues/69) | otevřeno | P2 | `pm` |
| [Q-PLT-01](#q-plt-01) | Které části má mít každá akce vždy (přihláška, platby) a které si má organizátor zapínat podle potřeby? | [US-20](https://github.com/applifting-vsecourse/team-1/issues/20) | otevřeno | P3 | `pm` |
| [Q-PLT-03](#q-plt-03) | Je v pořádku, že první ročník běží bez účtování, nebo je to nutnost? | [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) | otevřeno | P3 | `pm` |
| [Q-PLT-06](#q-plt-06) | Kdo je smluvní stranou vůči přihlašovateli: organizace, nebo provozovatel Togeny? (Souvisí s otázkou správce údajů v #164.) | [US-98](https://github.com/applifting-vsecourse/team-1/issues/167) | otevřeno | P3 | `pm` |
| [Q-PLT-07](#q-plt-07) | Co patří do admin portálu platformy kromě náhledu organizací a fakturace (deaktivace, audit log, statistiky, podpora)? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186) | otevřeno | P3 | `pm` |
| [Q-PLT-08](#q-plt-08) | Má se organizacím jen vyúčtovat (přehled k ruční fakturaci, jak říká US-70), nebo má platforma faktury vystavovat a evidovat jejich úhradu? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) | otevřeno | P3 | `pm` |
| [Q-PLT-09](#q-plt-09) | Jaký je obchodní model: poplatek za účastníka, předplatné, nebo obojí? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) | otevřeno | P3 | `pm` |
| [Q-PLT-10](#q-plt-10) | Jak se řeší odběratel a plátce, tedy fakturační údaje organizace (IČO, adresa, DPH)? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186) | otevřeno | P3 | `pm` |
| [Q-PLT-11](#q-plt-11) | Kdy reálně přijde druhá organizace (určuje, zda je portál potřeba pro první ročník)? **Duplicita s [Q-PLT-02](#q-plt-02).** | [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-69](https://github.com/applifting-vsecourse/team-1/issues/69) | otevřeno | P3 | `pm` |
| [Q-PLT-12](#q-plt-12) | Smí správce platformy vidět osobní údaje účastníků, nebo jen agregáty? | [#186](https://github.com/applifting-vsecourse/team-1/issues/186) | otevřeno | P3 | `pm` |

### Epic: přehledy

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-PRE-01](#q-pre-01) | Má administrace otevírat poslední akci, se kterou organizátor pracoval? | [US-51](https://github.com/applifting-vsecourse/team-1/issues/51) | otevřeno | P1 | `pm` |
| [Q-PRE-02](#q-pre-02) | Dashboard organizátora: jaký přesně obsah mají karty „co vyžaduje pozornost“? | [US-51](https://github.com/applifting-vsecourse/team-1/issues/51) | otevřeno | P1 | `pm` |
| [Q-PRE-03](#q-pre-03) | Které sestavy tiskneš nejčastěji kromě seznamu do autobusu? | [US-55](https://github.com/applifting-vsecourse/team-1/issues/55) | otevřeno | P3 | `pm` |
| [Q-PRE-04](#q-pre-04) | Stačí pamatovat filtry seznamu přihlášek jen v rámci session, nebo mají přežít zavření prohlížeče? | [#175](https://github.com/applifting-vsecourse/team-1/issues/175) | otevřeno | P3 | `pm` |

### Epic: přihlašování na akce

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-PRI-02](#q-pri-02) | Jaká lhůta na zaplacení platí pro náhradníka potvrzeného na poslední chvíli, např. týden před akcí? | [US-31](https://github.com/applifting-vsecourse/team-1/issues/31) | otevřeno | P1 | `pm` |
| [Q-PRI-03](#q-pri-03) | Platí pro změnu termínu stejné storno podmínky jako pro odhlášku (US-47)? | [US-32](https://github.com/applifting-vsecourse/team-1/issues/32) | otevřeno | P1 | `pm` |
| [Q-PRI-07](#q-pri-07) | Má změna termínu nebo odhláška proběhnout hned, nebo ji organizátor nejdřív schválí (kvůli kapacitě a storno podmínkám)? | [US-84](https://github.com/applifting-vsecourse/team-1/issues/84) | otevřeno | P1 | `pm` |
| [Q-PRI-14](#q-pri-14) | Má se do diagramu doplnit přechod Potvrzená → Náhradník (organizátor), jak říká ticket US-28? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | rozhodnuto, nezapsáno | P1 | `pm` |
| [Q-PRI-15](#q-pri-15) | Smí organizátor zrušit náhradníka kdykoli, nebo jen automaticky první den termínu? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | rozhodnuto, nezapsáno | P1 | `pm` |
| [Q-PRI-21](#q-pri-21) | Co se stane s náhradníky (a ostatními přihláškami) ve zrušeném termínu akce? | [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) | rozhodnuto, nezapsáno | P1 | `pm` |
| [Q-PRI-04](#q-pri-04) | Platí pravidlo „odhlášená přihláška se nepočítá do kontroly duplicity“ i pro termín zrušený organizátorem při vyhodnocení (stav „Zrušená“)? | [US-32](https://github.com/applifting-vsecourse/team-1/issues/32), [#160](https://github.com/applifting-vsecourse/team-1/issues/160) | otevřeno | P2 | `pm` |
| [Q-PRI-11](#q-pri-11) | Má se formát data narození řídit jazykem aplikace, nebo jazykem systému (a co na jiných zařízeních)? | [#177](https://github.com/applifting-vsecourse/team-1/issues/177) | otevřeno | P2 | `pm` |
| [Q-PRI-12](#q-pri-12) | Je v angličtině správný formát data narození DD/MM/YYYY (en-GB), nebo MM/DD/YYYY? | [#177](https://github.com/applifting-vsecourse/team-1/issues/177) | otevřeno | P2 | `pm` |
| [Q-PRI-20](#q-pri-20) | Od jaké hodiny se ruší náhradník první den termínu? | [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) | rozhodnuto, nezapsáno | P2 | `pm` |
| [Q-PRI-01](#q-pri-01) | Jaké výjimky dnes děláš (stálí účastníci, tým, sourozenci)? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | otevřeno | P3 | `pm` |
| [Q-PRI-09](#q-pri-09) | Používáš okna pro podání přihlášek podle věku či jiných údajů? | [US-87](https://github.com/applifting-vsecourse/team-1/issues/87) | otevřeno | P3 | `pm` |
| [Q-PRI-10](#q-pri-10) | Kdo je smí vidět, jak dlouho se uchovávají a má o záznamu účastník vědět? Potřebuješ to na kempu? | [US-88](https://github.com/applifting-vsecourse/team-1/issues/88) | otevřeno | P3 | `pm` |
| [Q-PRI-13](#q-pri-13) | Má u náhradníka na detailu přihlášky zůstat text „0 Kč do potvrzení“, nebo se změnit (např. „zatím nic k úhradě“)? | [#225](https://github.com/applifting-vsecourse/team-1/issues/225) | otevřeno | P3 | `pm` |

### Epic: technický základ

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-TEC-01](#q-tec-01) | Kolik lidí loni podalo přihlášku v první hodině? Jak předejít selhání systému ten večer? | [US-74](https://github.com/applifting-vsecourse/team-1/issues/74) | otevřeno | P3 | `pm` |
| [Q-TEC-02](#q-tec-02) | Jakou ztrátu dat je PO ochoten unést (hodina, den)? | [US-76](https://github.com/applifting-vsecourse/team-1/issues/76) | otevřeno | P3 | `pm` |
| [Q-TEC-03](#q-tec-03) | Jak dlouho se údaje po akci uchovávají? Viz #164. | [US-78](https://github.com/applifting-vsecourse/team-1/issues/78) | otevřeno | P3 | `pm` |
| [Q-TEC-04](#q-tec-04) | Potřebuješ do systému stará data, nebo ročník 2027 začne načisto? | [US-85](https://github.com/applifting-vsecourse/team-1/issues/85) | otevřeno | P3 | `pm` |
| [Q-TEC-05](#q-tec-05) | Přejmenovat typ účtu `PARTICIPANT` na `APPLICANT`? | – | otevřeno | P3 | `tech-lead` |
| [Q-TEC-06](#q-tec-06) | Připojit Figma konektor a převzít tokeny do `global.css`. | – | otevřeno | P3 | `tech-lead` |
| [Q-TEC-07](#q-tec-07) | Dopad zneplatnění magic linků na E2E (`magic-link.spec.ts`, `set-password.spec.ts`) a zápis pravidla do PROJEKT.md. | [#127](https://github.com/applifting-vsecourse/team-1/issues/127) | otevřeno | P3 | `tech-lead` |

### Epic: ubytování

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-UBY-01](#q-uby-01) | Brief uvádí rozdělení do pokojů mezi nutnostmi pro 7. 2., v rozhovoru ale pokoje řešíte na místě. Platí tedy Nice to have? | [US-35](https://github.com/applifting-vsecourse/team-1/issues/35) | otevřeno | P2 | `pm` |
| [Q-UBY-02](#q-uby-02) | Je ještě jiné pravidlo, které má systém hlídat? | [US-37](https://github.com/applifting-vsecourse/team-1/issues/37) | otevřeno | P3 | `pm` |
| [Q-UBY-03](#q-uby-03) | Mají být zájmena v přihlášce jako nepovinné pole? Organizátor LARP tábora je plánuje do přihlášek přidat. | [US-38](https://github.com/applifting-vsecourse/team-1/issues/38) | otevřeno | P3 | `pm` |
| [Q-UBY-04](#q-uby-04) | Necháme to až po rozdělení do pokojů (US-35)? | [US-39](https://github.com/applifting-vsecourse/team-1/issues/39) | otevřeno | P3 | `pm` |

### Epic: účty

| ID | Otázka | Dotčené US | Stav | Priorita | Čeká na |
| --- | --- | --- | --- | --- | --- |
| [Q-UCT-04](#q-uct-04) | Organizace: musí ji mít každý organizátor, nebo může pořádat akce sám? | [US-08](https://github.com/applifting-vsecourse/team-1/issues/8) | otevřeno | P1 | `pm` |
| [Q-UCT-01](#q-uct-01) | Mají e-maily chodit i samotnému účastníkovi, nebo jen přihlašovateli? Navrhujeme oběma. | [US-05](https://github.com/applifting-vsecourse/team-1/issues/5) | otevřeno | P2 | `pm` |
| [Q-UCT-02](#q-uct-02) | Od kolika let může účastník podat přihlášku sám? Platí to pro všechny akce stejně, nebo si to nastaví organizátor? | [US-07](https://github.com/applifting-vsecourse/team-1/issues/7) | otevřeno | P2 | `pm` |
| [Q-UCT-07](#q-uct-07) | Má nový magic link zneplatnit jen dříve vydané nepoužité odkazy, nebo i aktivní session? | [#127](https://github.com/applifting-vsecourse/team-1/issues/127) | otevřeno | P2 | `pm` |
| [Q-UCT-08](#q-uct-08) | Je pro klienta v pořádku, že obecná chybová hláška loginu zůstává bez nápovědy, jen s radou zkontrolovat e-mail z přihlášky? | [#187](https://github.com/applifting-vsecourse/team-1/issues/187) | otevřeno | P2 | `pm` |
| [Q-UCT-09](#q-uct-09) | Mají se v textech důsledně používat slova „přihlašovatel“ a „účastník“ podle slovníku, i když rodič rozdíl nepozná? | [#187](https://github.com/applifting-vsecourse/team-1/issues/187) | otevřeno | P2 | `pm` |
| [Q-UCT-05](#q-uct-05) | Potřebují lidé v administraci rozdílná oprávnění (např. pokladník jen platby), nebo pro začátek stačí, že všichni vidí všechno? | [US-11](https://github.com/applifting-vsecourse/team-1/issues/11) | otevřeno | P3 | `pm` |
| [Q-UCT-06](#q-uct-06) | Zabírají členové organizačního týmu lůžka v kapacitě akce? Platí za účast? | [US-93](https://github.com/applifting-vsecourse/team-1/issues/93) | otevřeno | P3 | `pm` |

## Uzavřeno

| ID | Otázka | Dotčené US | Důvod |
| --- | --- | --- | --- |
| [Q-PRI-05](#q-pri-05) | Vyhodnocuje se každý týden zvlášť? Navrhujeme ano. | [US-82](https://github.com/applifting-vsecourse/team-1/issues/82) | Board: „Akce = jeden celek s více termíny, každý termín se vyhodnocuje zvlášť.“ (PROJEKT.md §9). |
| [Q-PRI-06](#q-pri-06) | Ruční, nebo automatické schvalování přihlášek a e-mailů? | [US-82](https://github.com/applifting-vsecourse/team-1/issues/82) | PROJEKT.md §9, 23. 10.: organizátor si nastaví ruční, nebo automatické vyhodnocování. Zařazeno k US-82 jen kvůli epicu. |
| [Q-PRI-08](#q-pri-08) | Jak se účastník vrací do aplikace? (odpověď: nápady nechává PO na týmu) | [US-84](https://github.com/applifting-vsecourse/team-1/issues/84) | Status s PO 28. 10.: důvod k návratu účastníka (úprava přihlášky, platba, kontakt na organizátora), nápady nechává PO na týmu. Zařazeno k US-84 jen kvůli epicu. |
| [Q-UCT-03](#q-uct-03) | Má si nová organizace založit svůj profil v systému sám, nebo mu ho připravíme my? | [US-08](https://github.com/applifting-vsecourse/team-1/issues/8) | Nepřímá odpověď: status s PO 28. 10. řadí „založení organizace formou self-onboardingu“ do odsouhlaseného rozsahu sprintu. |
| [Q-PLA-01](#q-pla-01) | Vadí, že když přihlašovatel odešle formulář přihlášky za více účastníků, dostane každá přihláška v termínu vlastní variabilní symbol (účastník se dvěma termíny tedy platí dvě platby)? | [US-41](https://github.com/applifting-vsecourse/team-1/issues/41) | Rozhodnuto 21. 10.: jeden souhrnný e-mail, u každé přihlášky v termínu vlastní částka a variabilní symbol. Potvrzeno 28. 10. (platba se váže k termínu). |
| [Q-LOG-06](#q-log-06) | Má být checklist součástí programových bloků (US-66), nebo samostatný pro celou akci? Sdílí ho celý organizační tým? | [US-94](https://github.com/applifting-vsecourse/team-1/issues/94) | Issue samo uvádí „Rozhodnuto: ano“ (jen k části o sdílení týmem); k první části odpověď nenajdu. |
| [Q-PLT-04](#q-plt-04) | Kdo je správcem údajů: organizace, nebo provozovatel Togeny? | [US-77](https://github.com/applifting-vsecourse/team-1/issues/77) | Rozhodnuto 28. 10.: organizátor je správcem údajů účastníků, Togena zpracovatelem; Togena je správcem údajů organizátorů. |
| [Q-PLT-05](#q-plt-05) | Kdo je správcem osobních údajů: organizace, nebo provozovatel Togeny? (Odpověď tohoto issue uzavírá otázky z US-77 a US-78.) **Duplicita s [Q-PLT-04](#q-plt-04).** | [US-97](https://github.com/applifting-vsecourse/team-1/issues/164) | Správce údajů: rozhodnuto 28. 10. (viz US-77). Zůstává otevřená doba uchování (US-78) a smluvní strana (#167). |
| [Q-BEZ-06](#q-bez-06) | Název termínu: zůstává volitelný — co se starými názvy, má se překládat a kde se má zobrazovat? | [#180](https://github.com/applifting-vsecourse/team-1/issues/180) | Hlavní otázku (zrušit, nebo ponechat) rozhodl status 28. 10. Vedlejší otázky (migrace, překlad, zobrazení) jsou spíš pro tým; při potřebě je převést na samostatný bod. |
| [Q-PRI-16](#q-pri-16) | Stačí, že přechody ze stavu K vyhodnocení doplní US-102, aby se kritérium US-28 uzavřelo? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | Souhlas, přechody doplní US-102 (#195). |
| [Q-PRI-17](#q-pri-17) | Stačí v US-28 vědomé potvrzení nad kapacitu, když přistýlka (US-80) ještě neexistuje? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | Souhlas, stačí vědomé potvrzení; přistýlka přijde s US-80. |
| [Q-PRI-18](#q-pri-18) | Má se blok „Stav v termínech“ (detail přihlášky, dialog změny stavu, varování o kapacitě) dokreslit ve Figmě před mergem #232? | [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) | Merge neblokuje; mergnout a UI/UX dolaďovat zpětně ticketem enhancement. |
| [Q-PRI-19](#q-pri-19) | Sbírá se telefon ve formuláři přihlášky a v jaké story? (US-30 ho chce u náhradníka i s vytočením jedním klepnutím) | [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) | Neřešit v tomto PR; mergnout, telefon sbírat novým ticketem (někdy by tam určitě měl být). |
| [Q-KOM-11](#q-kom-11) | Stačí řešit sdružení e-mailů při změně více termínů téže přihlášky až v US-116? | [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) | Stačí vyřešit později (US-116). |
| [Q-NAS-12](#q-nas-12) | Je záměr, že zpřístupněná akce bez jediné přihlášky má zamčený režim vyhodnocování? | [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) | As-is stav je v pořádku; v budoucnu by měla jít změna do první přihlášky nebo nějaká kombinace. |

## Detail

<a id="q-bez-01"></a>

### Q-BEZ-01 – Jaké doklady zaměstnavatelé skutečně vyžadují a kdy a kým se mají vystavovat?

- **Epic:** bez epicu · **Dotčené US:** [#162](https://github.com/applifting-vsecourse/team-1/issues/162) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Nápad (label `idea`), bez epicu.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/162): „Jaké doklady zaměstnavatelé skutečně vyžadují (potvrzení, faktura, daňový doklad) a co musí obsahovat? / Má se doklad vystavovat až po zaplacení? / Kdo doklad zakládá: organizátor ručně, nebo ho systém generuje sám? / Mají na doklad vliv údaje o organizátorovi (IČO, adresa, číslo účtu)?“
- **Priorita:** P3 – Nápad (label idea), není ve storkách ani v rozsahu sprintu.

<a id="q-bez-02"></a>

### Q-BEZ-02 – Jaké doklady vyžadují zdravotní pojišťovny a liší se od dokladů pro zaměstnavatele (#162)?

- **Epic:** bez epicu · **Dotčené US:** [#163](https://github.com/applifting-vsecourse/team-1/issues/163) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Nápad (label `idea`), bez epicu. Souvisí s #162.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/163): „Jaké doklady pojišťovny skutečně vyžadují a liší se to mezi pojišťovnami? / Liší se požadavky od příspěvku zaměstnavatele (#162), nebo stačí jeden společný doklad? / Musí být pořadatel nebo akce na něco akreditovaný, aby se příspěvek dal čerpat? / Má se doklad vystavovat až po zaplacení?“
- **Priorita:** P3 – Nápad (label idea), není ve storkách ani v rozsahu sprintu.

<a id="q-bez-03"></a>

### Q-BEZ-03 – Kdo smí které zdravotní údaje vidět a zapisovat, jaké zákonné požadavky platí a má se to řešit jako jeden modul?

- **Epic:** bez epicu · **Dotčené US:** [#166](https://github.com/applifting-vsecourse/team-1/issues/166) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Nápad (label `idea`), bez epicu. Souvisí s #93 a #68.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/166): „Kdo smí které údaje vidět a zapisovat (zdravotník, vedoucí, ostatní personál)? … Jaké zákonné požadavky platí pro posudky, knihu úrazů a hlášení úrazů a jak dlouho se mají uchovávat? … Jak to zapadá do mazání a záznamu přístupů z #68 (US-79)? … Má se to řešit jako jeden modul, nebo jako samostatné funkce?“
- **Priorita:** P3 – Nápad (label idea), není ve storkách ani v rozsahu sprintu.

<a id="q-bez-04"></a>

### Q-BEZ-04 – Má být magic link i v e-mailu o změně přihlášky a v jakých případech e-mail magic link neobsahoval?

- **Epic:** bez epicu · **Dotčené US:** [#178](https://github.com/applifting-vsecourse/team-1/issues/178) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Zápis 27. 10. označil nedostatek za chybu (nesplňuje akceptační kritérium).
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/178): „V jakém konkrétním případě e-mail magic link neobsahoval …? Má být magic link i v e-mailu o změně přihlášky? Má se selhání vytvoření odkazu jen logovat, nebo to má být vidět víc?“
- **Priorita:** P1 – Potvrzená chyba: potvrzovací e-mail nesplňuje akceptační kritérium (zápis 27. 10.).

<a id="q-bez-05"></a>

### Q-BEZ-05 – Kde a jak dlouho smí formulář přihlášky držet osobní údaje (i dětí) v prohlížeči a jak se uloží formulář s více účastníky?

- **Epic:** bez epicu · **Dotčené US:** [#179](https://github.com/applifting-vsecourse/team-1/issues/179) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Samotné zachování údajů je rozhodnuto 28. 10. (zápis 27. 10. mělo „nice to have“). Otevřená zůstává otázka rozsahu a doby uložení.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/179): „Osobní údaje: ve formuláři jsou jméno, datum narození a e-mail, často dětí. Kde a jak dlouho je smíme v prohlížeči držet? … Víc účastníků: jak se uloží formulář, kde je víc účastníků nebo vybraných termínů?“
  - [zápis 28. 10., Přijatá rozhodnutí](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-28-status-s-po.md): „Formulář přihlášky bude zachovávat vyplněné údaje při refreshi.“
- **Priorita:** P2 – Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí.

<a id="q-bez-06"></a>

### Q-BEZ-06 – Název termínu: zůstává volitelný — co se starými názvy, má se překládat a kde se má zobrazovat?

- **Epic:** bez epicu · **Dotčené US:** [#180](https://github.com/applifting-vsecourse/team-1/issues/180) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Poznámka:** Hlavní otázku (zrušit, nebo ponechat) rozhodl status 28. 10. Vedlejší otázky (migrace, překlad, zobrazení) jsou spíš pro tým; při potřebě je převést na samostatný bod.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/180): „Co s názvy u existujících termínů (migrace dat)? / Kdyby název zůstal, má se překládat (pole pro cs a en)? / Kde všude se název dnes zobrazuje … a co by ho nahradilo?“
  - [PROJEKT.md §9, 28. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/PROJEKT.md#9-rozhodnutí): „Název termínu je volitelný, termín se primárně definuje datem.“
- **Uzavřeno, protože:** Hlavní otázku (zrušit, nebo ponechat) rozhodl status 28. 10. Vedlejší otázky (migrace, překlad, zobrazení) jsou spíš pro tým; při potřebě je převést na samostatný bod.

<a id="q-eko-01"></a>

### Q-EKO-01 – Stačí ti přehled za celou akci, nebo ho potřebuješ i po termínech?

- **Epic:** ekonomika · **Dotčené US:** [US-59](https://github.com/applifting-vsecourse/team-1/issues/59) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/59): „**Otevřená otázka na PO:** F-40 – stačí ti přehled za celou akci, nebo ho potřebuješ i po termínech?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-eko-02"></a>

### Q-EKO-02 – Které proměnné chceš měnit (počet lidí, cena, náklady)? Kdy v roce se takhle rozhodujete?

- **Epic:** ekonomika · **Dotčené US:** [US-61](https://github.com/applifting-vsecourse/team-1/issues/61) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/61): „**Otevřená otázka na PO:** F-41 – které proměnné chceš měnit (počet lidí, cena, náklady)? Kdy v roce se takhle rozhodujete?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-kom-01"></a>

### Q-KOM-01 – Potřebuješ to už pro první ročník (MVP), nebo zatím stačí Mailchimp?

- **Epic:** komunikace · **Dotčené US:** [US-57](https://github.com/applifting-vsecourse/team-1/issues/57) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/57): „**Otevřená otázka na PO:** F-38 – potřebuješ to už pro první ročník (MVP), nebo zatím stačí Mailchimp?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-kom-02"></a>

### Q-KOM-02 – Má být už v MVP, nebo stačí po spuštění přihlášek?

- **Epic:** komunikace · **Dotčené US:** [US-58](https://github.com/applifting-vsecourse/team-1/issues/58) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/58): „**Otevřená otázka na PO:** F-39 – má být už v MVP, nebo stačí po spuštění přihlášek?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-kom-03"></a>

### Q-KOM-03 – Stačí zvoneček v aplikaci a e-mail jako volba?

- **Epic:** komunikace · **Dotčené US:** [US-86](https://github.com/applifting-vsecourse/team-1/issues/86) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/86): „**Otevřená otázka na PO:** F-58 – stačí zvoneček v aplikaci a e-mail jako volba?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-kom-04"></a>

### Q-KOM-04 – Mají účastníci dostat upozornění, když se na nástěnce objeví něco nového? Je to MVP, nebo Nice to have?

- **Epic:** komunikace · **Dotčené US:** [US-91](https://github.com/applifting-vsecourse/team-1/issues/91) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/91): „**Otevřená otázka na PO:** F-65 – mají účastníci dostat upozornění, když se na nástěnce objeví něco nového? Je to MVP, nebo Nice to have?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-kom-05"></a>

### Q-KOM-05 – Pro které typy akcí to dává smysl?

- **Epic:** komunikace · **Dotčené US:** [US-92](https://github.com/applifting-vsecourse/team-1/issues/92) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/92): „**Otevřená otázka na PO:** F-66 – pro které typy akcí to dává smysl?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-kom-06"></a>

### Q-KOM-06 – Který e-mail dorazil anglicky a v jakém jazyce byl UI při odeslání přihlášky a při žádosti o odkaz?

- **Epic:** komunikace · **Dotčené US:** [#183](https://github.com/applifting-vsecourse/team-1/issues/183) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/183): „Který e-mail dorazil anglicky (předmět)? Byl uživatelský účet nový, nebo existující? V jakém jazyce byl UI při odeslání přihlášky a při žádosti o odkaz?“
  - [zápis 27. 10., Otevřené body](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-27-status.md#L76-L78): „E-mail jen v angličtině: jde o magic link, nebo o jiný e-mail?“
- **Priorita:** P1 – Potvrzená chyba (jazyk e-mailu), zápis 27. 10. ji vede jako otevřený bod k ověření.

<a id="q-kom-07"></a>

### Q-KOM-07 – Podle čeho se má volit jazyk samostatného magic link e-mailu: UI v okamžiku žádosti, User.locale, nebo jazyk poslední přihlášky?

- **Epic:** komunikace · **Dotčené US:** [#183](https://github.com/applifting-vsecourse/team-1/issues/183) · **Stav:** rozhodnuto, nezapsáno · **Čeká na:** `pm`
- **Poznámka:** Otázka je adresovaná PO nebo tech leadovi; autor navrhuje (a).
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/183): „Podle čeho se má jazyk samostatného magic link e-mailu volit? (a) podle jazyka UI v okamžiku žádosti (navrhuji …), (b) podle User.locale …, (c) podle jazyka po…“
  - [PR #231](https://github.com/applifting-vsecourse/team-1/pull/231)
- **Priorita:** P1 – Potvrzená chyba (jazyk e-mailu), zápis 27. 10. ji vede jako otevřený bod k ověření.
- **Rozhodnutí:** Jazyk magic link e-mailu je jazyk UI v okamžiku žádosti (varianta a z #183); chybí-li, použije se en. (tech-lead, 2026-10-30, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/231))
- **Dokumentace:** `docs/PROJEKT.md`: ceka, které jazyky platí pro který e-mail (zapsáno v PR #231, čeká na merge)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: ceka, totéž (PR #231)

<a id="q-kom-08"></a>

### Q-KOM-08 – Má se User.locale aktualizovat s každou přihláškou nebo přepnutím jazyka?

- **Epic:** komunikace · **Dotčené US:** [#183](https://github.com/applifting-vsecourse/team-1/issues/183) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #231, nejasnosti k byznys pravidlům](https://github.com/applifting-vsecourse/team-1/pull/231)
- **Priorita:** P2 – Žádný zdroj to neurčuje; reset hesla a ověření e-mailu u účtu založeného anglicky zůstávají anglicky.

<a id="q-kom-09"></a>

### Q-KOM-09 – Který text e-mailu platí: „Jste náhradník“ (EMAILY.md), nebo „čeká na potvrzení“ (stávající šablona)?

- **Epic:** komunikace · **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) · **Stav:** otevřeno · **Čeká na:** `tech-lead`
- **Poznámka:** Vodítko: „Jste náhradník“ je e-mail č. 3 (a č. 1 v auto režimu). PR #227 mění šablonu na „Náhradník“.
- **Zdroje:**
  - [PR #232](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Priorita:** P2 – PM: platí EMAILY.md, ale potřebuje vědět, o jaký e-mail (#) jde; po upřesnění rozhodne.

<a id="q-kom-10"></a>

### Q-KOM-10 – Kdo dodá text a vzhled e-mailu č. 6 („zrušeno, protože se neuvolnilo lůžko“)?

- **Epic:** komunikace · **Dotčené US:** [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** PM: dodám já.
- **Zdroje:**
  - [PR #236](https://github.com/applifting-vsecourse/team-1/pull/236)
- **Priorita:** P2 – Ve Figmě rámec není; text je zatím věta z kritérií.

<a id="q-kom-11"></a>

### Q-KOM-11 – Stačí řešit sdružení e-mailů při změně více termínů téže přihlášky až v US-116?

- **Epic:** komunikace · **Dotčené US:** [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #236](https://github.com/applifting-vsecourse/team-1/pull/236)
- **Priorita:** P3 – EMAILY.md chce jeden e-mail na přihlášku; úloha mění termíny jednotlivě.
- **Rozhodnutí:** Stačí vyřešit později (US-116). (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/236))
- **Navazující ticket:** [US-116 (#209): ověřit, že kritéria obsahují sdružení e-mailů](https://github.com/applifting-vsecourse/team-1/issues/209)

<a id="q-log-01"></a>

### Q-LOG-01 – Které další dokumenty kromě bezinfekčnosti od účastníků potřebuješ?

- **Epic:** logistika · **Dotčené US:** [US-62](https://github.com/applifting-vsecourse/team-1/issues/62) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/62): „**Otevřená otázka na PO:** F-42 – které další dokumenty kromě bezinfekčnosti od účastníků potřebuješ?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-log-02"></a>

### Q-LOG-02 – Jaké varianty nabízíš a kdy potřebuje kuchyně počty?

- **Epic:** logistika · **Dotčené US:** [US-64](https://github.com/applifting-vsecourse/team-1/issues/64) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/64): „**Otevřená otázka na PO:** F-43 – jaké varianty nabízíš a kdy potřebuje kuchyně počty?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-log-03"></a>

### Q-LOG-03 – Hlídá se kapacita autobusu? Je doprava v ceně, nebo je vlastní doprava sleva (US-49)?

- **Epic:** logistika · **Dotčené US:** [US-65](https://github.com/applifting-vsecourse/team-1/issues/65) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/65): „**Otevřená otázka na PO:** F-44 – hlídá se kapacita autobusu? Je doprava v ceně, nebo je vlastní doprava sleva (US-49)?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-log-04"></a>

### Q-LOG-04 – Stačí pro začátek jen harmonogram pro všechny? Mají mít volitelné bloky omezenou kapacitu?

- **Epic:** logistika · **Dotčené US:** [US-66](https://github.com/applifting-vsecourse/team-1/issues/66) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/66): „**Otevřená otázka na PO:** F-45 – stačí pro začátek jen harmonogram pro všechny? Mají mít volitelné bloky omezenou kapacitu?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-log-05"></a>

### Q-LOG-05 – Kdo z týmu je smí vidět (jen zdravotník?) a jak dlouho se po akci uchovávají?

- **Epic:** logistika · **Dotčené US:** [US-68](https://github.com/applifting-vsecourse/team-1/issues/68) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/68): „**Otevřená otázka na PO:** F-46 – kdo z týmu je smí vidět (jen zdravotník?) a jak dlouho se po akci uchovávají?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-log-06"></a>

### Q-LOG-06 – Má být checklist součástí programových bloků (US-66), nebo samostatný pro celou akci? Sdílí ho celý organizační tým?

- **Epic:** logistika · **Dotčené US:** [US-94](https://github.com/applifting-vsecourse/team-1/issues/94) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Poznámka:** Issue samo uvádí „Rozhodnuto: ano“ (jen k části o sdílení týmem); k první části odpověď nenajdu.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/94): „F-68 – má být checklist součástí programových bloků (US-66), nebo samostatný pro celou akci? Sdílí ho celý organizační tým? Rozhodnuto: ano.“
- **Uzavřeno, protože:** Issue samo uvádí „Rozhodnuto: ano“ (jen k části o sdílení týmem); k první části odpověď nenajdu.

<a id="q-log-07"></a>

### Q-LOG-07 – Souhlasíš, že je řešíme až nakonec, případně napojením na externí služby?

- **Epic:** logistika · **Dotčené US:** [US-95](https://github.com/applifting-vsecourse/team-1/issues/95) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/95): „**Otevřená otázka na PO:** F-47 – souhlasíš, že je řešíme až nakonec, případně napojením na externí služby?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-nas-01"></a>

### Q-NAS-01 – Vyhovuje to tak pro všechny akce, nebo má mít organizátor možnost přihlášky po naplnění úplně zavřít?

- **Epic:** nastavení akce · **Dotčené US:** [US-18](https://github.com/applifting-vsecourse/team-1/issues/18) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/18): „**Otevřená otázka na PO:** F-09 – vyhovuje to tak pro všechny akce, nebo má mít organizátor možnost přihlášky po naplnění úplně zavřít?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-nas-02"></a>

### Q-NAS-02 – Jaké typy otázek potřebuješ? Má jít podrobný formulář přihlášky uložit jako šablonu pro další akce? Je to spíš MVP, nebo Nice to have?

- **Epic:** nastavení akce · **Dotčené US:** [US-19](https://github.com/applifting-vsecourse/team-1/issues/19) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/19): „**Otevřená otázka na PO:** F-11 – jaké typy otázek potřebuješ? Má jít podrobný formulář přihlášky uložit jako šablonu pro další akce? Je to spíš MVP, nebo Nice to have?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-nas-03"></a>

### Q-NAS-03 – Stačí kopie celé akce, nebo chceš areál a formulář spravovat zvlášť (US-81)? Je to spíš MVP, nebo Nice to have?

- **Epic:** nastavení akce · **Dotčené US:** [US-21](https://github.com/applifting-vsecourse/team-1/issues/21) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/21): „**Otevřená otázka na PO:** F-12 – stačí kopie celé akce, nebo chceš areál a formulář spravovat zvlášť ([US-81](https://github.com/applifting-vsecourse/team-1/issues/81))? Je to spíš MVP, nebo Nice to have?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-nas-04"></a>

### Q-NAS-04 – Co všechno má přihlašovatel o akci vidět, než podá přihlášku? Má být stránka dostupná komukoliv, nebo jen přes odkaz od organizátora?

- **Epic:** nastavení akce · **Dotčené US:** [US-22](https://github.com/applifting-vsecourse/team-1/issues/22) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Status s PO 28. 10.: veřejné údaje se mohou převzít ze založení akce a doplnit o fotografii, „přesný seznam polí nebyl určen“, musí ale existovat jedno místo, odkud je web čerpá.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/22): „**Otevřená otázka na PO:** F-10 – co všechno má přihlašovatel o akci vidět, než podá přihlášku? Má být stránka dostupná komukoliv, nebo jen přes odkaz od organizátora?“
- **Priorita:** P1 – Veřejná stránka akce je v návrhu PO pro sprint 3 (návštěvník webu) a seznam polí není určen.

<a id="q-nas-05"></a>

### Q-NAS-05 – Jaká pole veřejných údajů o akci (fotografie atd.) se mají zobrazovat na veřejné stránce?

- **Epic:** nastavení akce · **Dotčené US:** [US-22](https://github.com/applifting-vsecourse/team-1/issues/22) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Doplňuje otázku F-10 z US-22 výše.
- **Zdroje:**
  - [zápis 28. 10., Upřesnění požadavků](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-28-status-s-po.md): „Veřejné údaje o akci se mohou převzít ze založení akce a doplnit například o fotografii. Přesný seznam polí nebyl určen; musí ale existovat jedno místo, odkud veřejný web informace čerpá.“
- **Priorita:** P1 – Veřejná stránka akce je v návrhu PO pro sprint 3 (návštěvník webu) a seznam polí není určen.

<a id="q-nas-06"></a>

### Q-NAS-06 – Stačí kopie celé akce, nebo chceš areál a formulář spravovat zvlášť a vybírat je při zakládání akce?

- **Epic:** nastavení akce · **Dotčené US:** [US-81](https://github.com/applifting-vsecourse/team-1/issues/81) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Duplicita s:** [Q-NAS-03](#q-nas-03)
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/81): „**Otevřená otázka na PO:** F-12 – stačí kopie celé akce, nebo chceš areál a formulář spravovat zvlášť a vybírat je při zakládání akce?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-nas-07"></a>

### Q-NAS-07 – Přidají se zkopírované pokoje k existujícím pokojům cílového termínu, nebo je nahradí?

- **Epic:** nastavení akce · **Dotčené US:** [US-100](https://github.com/applifting-vsecourse/team-1/issues/193), [US-99](https://github.com/applifting-vsecourse/team-1/issues/192) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/193): „přidají se zkopírované pokoje k existujícím pokojům cílového termínu, nebo je nahradí?“
- **Priorita:** P1 – US-100 je ve sprintu 3 a bez odpovědi nejde implementovat kopírování pokojů.

<a id="q-nas-08"></a>

### Q-NAS-08 – Sedí, že pořadník vychází z termínu a režimu pokojů celé akce, nebo se má režim pokojů lišit po termínech?

- **Epic:** nastavení akce · **Dotčené US:** [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) · **Stav:** rozhodnuto, nezapsáno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #234](https://github.com/applifting-vsecourse/team-1/pull/234)
- **Priorita:** P1 – Pokoje po termínech má řešit US-99 (#192); kód má režim na akci.
- **Rozhodnutí:** Systém má umožnit odlišný režim pokojů v odlišných termínech. „Implementováno“ v #80 znamená, že to řeší odkazovaný ticket, ne že je hotovo; pravdu říká stav #192 (US-99). (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/234))
- **Dokumentace:** `docs/PROJEKT.md`: ceka, řádek 71 říká „Režim pokojů zůstává na úrovni akce“ a datový model má Event.roomMode: rozpor s rozhodnutím
- **Navazující ticket:** [US-99 (#192): režim pokojů po termínech](https://github.com/applifting-vsecourse/team-1/issues/192)
- **Navazující ticket:** [#80: opravit formulaci „implementováno“](https://github.com/applifting-vsecourse/team-1/issues/80)

<a id="q-nas-09"></a>

### Q-NAS-09 – Je ve společných pokojích pořadí náhradníků jedno pro obě pohlaví v rámci termínu?

- **Epic:** nastavení akce · **Dotčené US:** [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) · **Stav:** rozhodnuto, nezapsáno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #234](https://github.com/applifting-vsecourse/team-1/pull/234)
- **Priorita:** P2 – Pravidlo pořadníku není v dokumentaci.
- **Rozhodnutí:** Ano; pokud pokoj nemá dané pohlaví, je fronta přihlášek jedna pro obě pohlaví. (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/234))
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/`: ceka, pravidlo pořadníku (skupina lůžek), místo určí model-update

<a id="q-nas-10"></a>

### Q-NAS-10 – Chybí mobilní rámec (360 px) pořadníku ve Figmě. Kdo ho dodá?

- **Epic:** nastavení akce · **Dotčené US:** [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) · **Stav:** otevřeno · **Čeká na:** `design`
- **Zdroje:**
  - [PR #234](https://github.com/applifting-vsecourse/team-1/pull/234)
- **Priorita:** P2 – Mobil staví na existující kartě seznamu přihlášek bez vlastního rámce.

<a id="q-nas-11"></a>

### Q-NAS-11 – Co přesně je „otevření přihlášek“, od kterého se zamyká režim vyhodnocování?

- **Epic:** nastavení akce · **Dotčené US:** [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) · **Stav:** rozhodnuto, nezapsáno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #238](https://github.com/applifting-vsecourse/team-1/pull/238)
- **Priorita:** P1 – V kódu ani PROJEKT.md §5 stav „otevřeno“ není.
- **Rozhodnutí:** Aktuálně moment, kdy akce splní všechny požadavky (termín, ubytování atd.); pak se vygeneruje link a přihlašování se spustí. V budoucnu ruční nebo plánované spuštění a ruční pozastavení přihlášek (např. při výpadku ubytování). (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/238))
- **Dokumentace:** `docs/PROJEKT.md`: ceka, sekce 5: definice „otevření přihlášek“ a výhled (plánované spuštění, pozastavení)
- **Navazující ticket:** ruční nebo plánované spuštění přihlášek (k založení)
- **Navazující ticket:** ruční pozastavení přihlášek (k založení)

<a id="q-nas-12"></a>

### Q-NAS-12 – Je záměr, že zpřístupněná akce bez jediné přihlášky má zamčený režim vyhodnocování?

- **Epic:** nastavení akce · **Dotčené US:** [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #238](https://github.com/applifting-vsecourse/team-1/pull/238)
- **Priorita:** P2 – Zamčeno jakmile akce splní podmínky nebo má přihlášku.
- **Rozhodnutí:** As-is stav je v pořádku; v budoucnu by měla jít změna do první přihlášky nebo nějaká kombinace. (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/238))
- **Navazující ticket:** změna režimu vyhodnocování do první přihlášky (nebo kombinace) (k založení)

<a id="q-nas-13"></a>

### Q-NAS-13 – Slovník říká „Režim vyhodnocení“, Figma „Režim vyhodnocování“. Která varianta platí?

- **Epic:** nastavení akce · **Dotčené US:** [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) · **Stav:** otevřeno · **Čeká na:** `tech-lead`
- **Zdroje:**
  - [PR #238](https://github.com/applifting-vsecourse/team-1/pull/238)
- **Priorita:** P3 – PR #238 použilo Figmu; rozhodne tech lead, zda se mění slovník, nebo design.

<a id="q-nas-14"></a>

### Q-NAS-14 – Která sada textů nastavení režimu platí: desktopový, nebo mobilní rámec (jiné podnadpisy, nápověda, tlačítko)?

- **Epic:** nastavení akce · **Dotčené US:** [US-101 (#194)](https://github.com/applifting-vsecourse/team-1/issues/194) · **Stav:** otevřeno · **Čeká na:** `design`
- **Zdroje:**
  - [PR #238](https://github.com/applifting-vsecourse/team-1/pull/238)
- **Priorita:** P3 – Rámce se v textech liší; PR #238 použilo desktopové pro obě šířky.

<a id="q-pla-01"></a>

### Q-PLA-01 – Vadí, že když přihlašovatel odešle formulář přihlášky za více účastníků, dostane každá přihláška v termínu vlastní variabilní symbol (účastník se dvěma termíny tedy platí dvě platby)?

- **Epic:** platby · **Dotčené US:** [US-41](https://github.com/applifting-vsecourse/team-1/issues/41) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Poznámka:** Rozhodnuto 21. 10.: jeden souhrnný e-mail, u každé přihlášky v termínu vlastní částka a variabilní symbol. Potvrzeno 28. 10. (platba se váže k termínu).
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/41): „**Otevřená otázka na PO:** F-26 – vadí, že když přihlašovatel odešle formulář přihlášky za více účastníků, dostane každá přihláška v termínu vlastní variabilní symbol (účastník se dvěma termíny tedy platí dvě platby)?“
  - [PROJEKT.md §9, 21. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/PROJEKT.md#9-rozhodnutí): „Souhrnný potvrzovací e-mail. Přihlašovatel dostane JEDEN e-mail za celé odeslání formuláře … vlastní variabilní symbol“
  - [PROJEKT.md §9, 28. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/PROJEKT.md#9-rozhodnutí): „Platba se váže ke konkrétnímu termínu.“
- **Uzavřeno, protože:** Rozhodnuto 21. 10.: jeden souhrnný e-mail, u každé přihlášky v termínu vlastní částka a variabilní symbol. Potvrzeno 28. 10. (platba se váže k termínu).

<a id="q-pla-02"></a>

### Q-PLA-02 – Stačí nahrání výpisu, nebo čekáte, že si systém platby načte z bankovního účtu sám? U které banky máte bankovní účet a můžete nám k němu zřídit přístup pro čtení? Blokuje ready.

- **Epic:** platby · **Dotčené US:** [US-43](https://github.com/applifting-vsecourse/team-1/issues/43) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Pozor: board uvádí „Platby bez brány a bez banky — ruční zápis“; otázka v issue to nechává jako blokující pro „ready“.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/43): „**Otevřená otázka na PO:** F-27 KLÍČOVÉ – stačí nahrání výpisu, nebo čekáte, že si systém platby načte z bankovního účtu sám? U které banky máte bankovní účet a můžete nám k němu zřídit přístup pro čtení? Blokuje ready.“
- **Priorita:** P2 – Označeno jako klíčové a blokující, ale board říká „platby bez banky“ a US je „Později“.

<a id="q-pla-03"></a>

### Q-PLA-03 – Co po poslední výzvě k zaplacení bez reakce: jen označit pro telefonát (US-45), nebo má systém přihlášku po nějaké době sám zrušit?

- **Epic:** platby · **Dotčené US:** [US-46](https://github.com/applifting-vsecourse/team-1/issues/46) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/46): „**Otevřená otázka na PO:** F-29 – co po poslední výzvě k zaplacení bez reakce: jen označit pro telefonát (US-45), nebo má systém přihlášku po nějaké době sám zrušit?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-pla-04"></a>

### Q-PLA-04 – Jak se počítá storno při odhlášce méně než 30 dní před akcí: procento z ceny, pevná částka, nebo podle toho, jestli se za účastníka najde náhradník?

- **Epic:** platby · **Dotčené US:** [US-47](https://github.com/applifting-vsecourse/team-1/issues/47) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/47): „**Otevřená otázka na PO:** F-30 – jak se počítá storno při odhlášce méně než 30 dní před akcí: procento z ceny, pevná částka, nebo podle toho, jestli se za účastníka najde náhradník?“
- **Priorita:** P2 – Storno podmínky jsou v návrhu PO („odkdy běží“), výpočet storna ale není určen.

<a id="q-pla-05"></a>

### Q-PLA-05 – Doúčtovává pořadatel po akci? Rozpočítání výdaje mezi účastníky je samostatná otázka.

- **Epic:** platby · **Dotčené US:** [US-48](https://github.com/applifting-vsecourse/team-1/issues/48) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Issue je zavřené, otázka v něm zůstala bez odpovědi.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/48): „**Otevřená otázka na PO:** F-28 – doúčtovává pořadatel po akci? Rozpočítání výdaje mezi účastníky je samostatná otázka.“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-pla-06"></a>

### Q-PLA-06 – Kdo ověří nárok na slevu (např. členství ve spolku)?

- **Epic:** platby · **Dotčené US:** [US-49](https://github.com/applifting-vsecourse/team-1/issues/49) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/49): „**Otevřená otázka na PO:** F-31 – kdo ověří nárok na slevu (např. členství ve spolku)?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-pla-07"></a>

### Q-PLA-07 – Má pořadatel účastníky ze zahraničí?

- **Epic:** platby · **Dotčené US:** [US-50](https://github.com/applifting-vsecourse/team-1/issues/50) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Issue je zavřené, otázka v něm zůstala bez odpovědi.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/50): „**Otevřená otázka na PO:** F-30 – má pořadatel účastníky ze zahraničí?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-pla-08"></a>

### Q-PLA-08 – Má systém organizátora upozornit hned po první zmeškané splátce?

- **Epic:** platby · **Dotčené US:** [US-89](https://github.com/applifting-vsecourse/team-1/issues/89) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/89): „**Otevřená otázka na PO:** F-62 – má systém organizátora upozornit hned po první zmeškané splátce?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-pla-09"></a>

### Q-PLA-09 – Jaké příplatky nabízíš? Vybírají se v přihlášce, nebo až po potvrzení?

- **Epic:** platby · **Dotčené US:** [US-90](https://github.com/applifting-vsecourse/team-1/issues/90) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/90): „**Otevřená otázka na PO:** F-64 – jaké příplatky nabízíš? Vybírají se v přihlášce, nebo až po potvrzení?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-pla-10"></a>

### Q-PLA-10 – Co s už zapsanými platbami a už vydanými variabilními symboly (migrace, nebo přepsání seedu)?

- **Epic:** platby · **Dotčené US:** [#174](https://github.com/applifting-vsecourse/team-1/issues/174) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Dokud není zodpovězeno, nedomýšlí se to do kódu.
- **Zdroje:**
  - [issue, Otevřené otázky 1](https://github.com/applifting-vsecourse/team-1/issues/174): „Dotaz na Adama: Co s už zapsanými platbami a už vydanými VS? Návrh: pokud existují jen demo a seed data, přepsat seed a data nemigrovat. …“
- **Priorita:** P1 – Rozpracovaný ticket o platbě v termínu; kód se bez odpovědí nedomýšlí a PO 28. 10. platbu v termínu výslovně chtěl.

<a id="q-pla-11"></a>

### Q-PLA-11 – K jaké přihlášce v termínu patří přeplatek a co se stane s platbou zrušeného termínu nebo náhradníka?

- **Epic:** platby · **Dotčené US:** [#174](https://github.com/applifting-vsecourse/team-1/issues/174) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue, Otevřené otázky 2](https://github.com/applifting-vsecourse/team-1/issues/174): „Nikde není psáno, zda přeplatek PVT, která se zruší, zůstává k převodu na jinou PVT, nebo se vrací.“
  - [PROJEKT.md §9, 28. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/PROJEKT.md#9-rozhodnutí): „vratka se eviduje zápornou platbou“
- **Priorita:** P1 – Rozpracovaný ticket o platbě v termínu; kód se bez odpovědí nedomýšlí a PO 28. 10. platbu v termínu výslovně chtěl.

<a id="q-pla-12"></a>

### Q-PLA-12 – Patří editace a doplnění platby do tohoto ticketu (dnes US-44 umí zápis a zrušení, ne úpravu)?

- **Epic:** platby · **Dotčené US:** [#174](https://github.com/applifting-vsecourse/team-1/issues/174), [US-44](https://github.com/applifting-vsecourse/team-1/issues/44) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue, Otevřené otázky 3](https://github.com/applifting-vsecourse/team-1/issues/174): „Zápis z 28. 10. mezi upřesněními uvádí „možnost editace, doplnění“ plateb. US-44 dnes umí zápis a zrušení, ne úpravu.“
  - [zápis 28. 10., Upřesnění požadavků](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-28-status-s-po.md): „Platby: možnost editace, doplnění a záporné platby jako vratky“
- **Priorita:** P1 – Rozpracovaný ticket o platbě v termínu; kód se bez odpovědí nedomýšlí a PO 28. 10. platbu v termínu výslovně chtěl.

<a id="q-pla-13"></a>

### Q-PLA-13 – Je ticket o platbě v termínu zařazen do dalšího sprintu?

- **Epic:** platby · **Dotčené US:** [#174](https://github.com/applifting-vsecourse/team-1/issues/174) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue, Otevřené otázky 4](https://github.com/applifting-vsecourse/team-1/issues/174): „Zápis z 27. 10. ho vedl jako „mimo Sprint 3“ a k odsouhlasení měl „projít proces před implementací“.“
  - [zápis 27. 10., Ke schválení PO](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-27-status.md#L76-L84): „Platby per přihláška v termínu: projít proces před implementací a odsouhlasit zařazení do dalšího sprintu.“
- **Priorita:** P1 – Rozpracovaný ticket o platbě v termínu; kód se bez odpovědí nedomýšlí a PO 28. 10. platbu v termínu výslovně chtěl.

<a id="q-plt-01"></a>

### Q-PLT-01 – Které části má mít každá akce vždy (přihláška, platby) a které si má organizátor zapínat podle potřeby?

- **Epic:** platforma · **Dotčené US:** [US-20](https://github.com/applifting-vsecourse/team-1/issues/20) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/20): „**Otevřená otázka na PO:** F-51 – které části má mít každá akce vždy (přihláška, platby) a které si má organizátor zapínat podle potřeby?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-plt-02"></a>

### Q-PLT-02 – Kdy reálně přijde druhá organizace? Chcete nové organizace schvalovat?

- **Epic:** platforma · **Dotčené US:** [US-69](https://github.com/applifting-vsecourse/team-1/issues/69) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Souvisí s otevřeným bodem ze statusu 27. 10. (Organizace: musí ji mít každý organizátor?) a s #186.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/69): „**Otevřená otázka na PO:** F-48 – kdy reálně přijde druhá organizace? Chcete nové organizace schvalovat?“
- **Priorita:** P2 – Souvisí s self-onboardingem organizace (sprint 3) a otevřeným bodem o povinné organizaci.

<a id="q-plt-03"></a>

### Q-PLT-03 – Je v pořádku, že první ročník běží bez účtování, nebo je to nutnost?

- **Epic:** platforma · **Dotčené US:** [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/70): „**Otevřená otázka na PO:** F-50 – je v pořádku, že první ročník běží bez účtování, nebo je to nutnost?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-plt-04"></a>

### Q-PLT-04 – Kdo je správcem údajů: organizace, nebo provozovatel Togeny?

- **Epic:** platforma · **Dotčené US:** [US-77](https://github.com/applifting-vsecourse/team-1/issues/77) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Poznámka:** Rozhodnuto 28. 10.: organizátor je správcem údajů účastníků, Togena zpracovatelem; Togena je správcem údajů organizátorů.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/77): „**Otevřená otázka na PO:** F-56 – kdo je správcem údajů: organizace, nebo provozovatel Togeny?“
  - [zápis 28. 10., Přijatá rozhodnutí](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-28-status-s-po.md): „GDPR má nízkou prioritu, jen základní smysluplné zásady (organizátor je správcem údajů účastníků, Togena jejich zpracovatelem; Togena je správcem údajů organizátorů).“
- **Uzavřeno, protože:** Rozhodnuto 28. 10.: organizátor je správcem údajů účastníků, Togena zpracovatelem; Togena je správcem údajů organizátorů.

<a id="q-plt-05"></a>

### Q-PLT-05 – Kdo je správcem osobních údajů: organizace, nebo provozovatel Togeny? (Odpověď tohoto issue uzavírá otázky z US-77 a US-78.)

- **Epic:** platforma · **Dotčené US:** [US-97](https://github.com/applifting-vsecourse/team-1/issues/164) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Duplicita s:** [Q-PLT-04](#q-plt-04)
- **Poznámka:** Správce údajů: rozhodnuto 28. 10. (viz US-77). Zůstává otevřená doba uchování (US-78) a smluvní strana (#167).
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/164): „**Otevřená otázka na PO:** F-56 – kdo je správcem osobních údajů: organizace, nebo provozovatel Togeny? (Odpověď tohoto issue uzavírá otázky z US-77 a US-78.)“
  - [zápis 28. 10., Přijatá rozhodnutí](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-28-status-s-po.md): „GDPR má nízkou prioritu … organizátor je správcem údajů účastníků, Togena jejich zpracovatelem; Togena je správcem údajů organizátorů.“
- **Uzavřeno, protože:** Správce údajů: rozhodnuto 28. 10. (viz US-77). Zůstává otevřená doba uchování (US-78) a smluvní strana (#167).

<a id="q-plt-06"></a>

### Q-PLT-06 – Kdo je smluvní stranou vůči přihlašovateli: organizace, nebo provozovatel Togeny? (Souvisí s otázkou správce údajů v #164.)

- **Epic:** platforma · **Dotčené US:** [US-98](https://github.com/applifting-vsecourse/team-1/issues/167) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Souvisí s #164; odpověď o správci údajů (28. 10.) nerozhoduje, kdo je smluvní stranou.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/167): „**Otevřená otázka na PO:** Kdo je smluvní stranou vůči přihlašovateli: organizace, nebo provozovatel Togeny? (Souvisí s otázkou správce údajů v #164.)“
- **Priorita:** P3 – GDPR má podle PO 28. 10. nízkou prioritu.

<a id="q-plt-07"></a>

### Q-PLT-07 – Co patří do admin portálu platformy kromě náhledu organizací a fakturace (deaktivace, audit log, statistiky, podpora)?

- **Epic:** platforma · **Dotčené US:** [#186](https://github.com/applifting-vsecourse/team-1/issues/186) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Platformový admin se podle 28. 10. do tohoto sprintu nezařazuje.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/186): „Co patří do admin portálu kromě náhledu a fakturace (deaktivace organizace, audit log, statistiky, podpora)?“
  - [zápis 28. 10., Interní debata](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-28-status-s-po.md): „Platformový admin s přístupem ke všem organizacím zatím neexistuje; Adam Hanuš nevidí byznysovou potřebu v tomto sprintu.“
- **Priorita:** P3 – Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.).

<a id="q-plt-08"></a>

### Q-PLT-08 – Má se organizacím jen vyúčtovat (přehled k ruční fakturaci, jak říká US-70), nebo má platforma faktury vystavovat a evidovat jejich úhradu?

- **Epic:** platforma · **Dotčené US:** [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/186): „Dotaz na Adama: Má se organizacím jen vyúčtovat (přehled k ruční fakturaci, jak říká US-70), nebo má platforma faktury vystavovat a evidovat jejich úhradu?“
- **Priorita:** P3 – Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.).

<a id="q-plt-09"></a>

### Q-PLT-09 – Jaký je obchodní model: poplatek za účastníka, předplatné, nebo obojí?

- **Epic:** platforma · **Dotčené US:** [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-70](https://github.com/applifting-vsecourse/team-1/issues/70) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/186): „Dotaz na Adama: Jaký je obchodní model: poplatek za účastníka, předplatné, nebo obojí? US-70 předpokládá jen poplatek za účastníka a cenový model se teprve ověřuje v Lean Canvasu.“
- **Priorita:** P3 – Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.).

<a id="q-plt-10"></a>

### Q-PLT-10 – Jak se řeší odběratel a plátce, tedy fakturační údaje organizace (IČO, adresa, DPH)?

- **Epic:** platforma · **Dotčené US:** [#186](https://github.com/applifting-vsecourse/team-1/issues/186) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/186): „Dotaz na Adama: Jak se řeší odběratel a plátce, tedy fakturační údaje organizace (IČO, adresa, DPH)? V modelu Organization zatím nejsou.“
- **Priorita:** P3 – Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.).

<a id="q-plt-11"></a>

### Q-PLT-11 – Kdy reálně přijde druhá organizace (určuje, zda je portál potřeba pro první ročník)?

- **Epic:** platforma · **Dotčené US:** [#186](https://github.com/applifting-vsecourse/team-1/issues/186), [US-69](https://github.com/applifting-vsecourse/team-1/issues/69) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Duplicita s:** [Q-PLT-02](#q-plt-02)
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/186): „Dotaz na Adama: Kdy reálně přijde druhá organizace? Určí to, jestli je portál potřeba pro první ročník, nebo až později (stejná otázka jako u US-69).“
- **Priorita:** P3 – Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.).

<a id="q-plt-12"></a>

### Q-PLT-12 – Smí správce platformy vidět osobní údaje účastníků, nebo jen agregáty?

- **Epic:** platforma · **Dotčené US:** [#186](https://github.com/applifting-vsecourse/team-1/issues/186) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/186): „Smí správce vidět osobní údaje účastníků, nebo jen agregáty?“
- **Priorita:** P3 – Platformový admin se do sprintu 3 nezařazuje, byznysová potřeba nepotvrzena (zápis 28. 10.).

<a id="q-pre-01"></a>

### Q-PRE-01 – Má administrace otevírat poslední akci, se kterou organizátor pracoval?

- **Epic:** přehledy · **Dotčené US:** [US-51](https://github.com/applifting-vsecourse/team-1/issues/51) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/51): „**Otevřená otázka na PO:** F-33 – má administrace otevírat poslední akci, se kterou organizátor pracoval?“
- **Priorita:** P1 – Dashboard se vrací a je v návrhu PO; obsah karet není určen.

<a id="q-pre-02"></a>

### Q-PRE-02 – Dashboard organizátora: jaký přesně obsah mají karty „co vyžaduje pozornost“?

- **Epic:** přehledy · **Dotčené US:** [US-51](https://github.com/applifting-vsecourse/team-1/issues/51) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Dashboard se vrací (28. 10.), obsah karet zůstává nespecifikovaný. Zdroj není vázán na konkrétní issue; zařazeno k #51 (přehledy) jen kvůli epicu.
- **Zdroje:**
  - [zápis 27. 10., Ke schválení PO](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-27-status.md#L80-L86): „Dashboard: přesný obsah karet „co vyžaduje pozornost“.“
  - [PROJEKT.md §9, 28. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/PROJEKT.md#9-rozhodnutí): „Dashboard organizátora se vrací … zaměřený na actionability“
- **Priorita:** P1 – Dashboard se vrací a je v návrhu PO; obsah karet není určen.

<a id="q-pre-03"></a>

### Q-PRE-03 – Které sestavy tiskneš nejčastěji kromě seznamu do autobusu?

- **Epic:** přehledy · **Dotčené US:** [US-55](https://github.com/applifting-vsecourse/team-1/issues/55) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/55): „**Otevřená otázka na PO:** F-36 – které sestavy tiskneš nejčastěji kromě seznamu do autobusu?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-pre-04"></a>

### Q-PRE-04 – Stačí pamatovat filtry seznamu přihlášek jen v rámci session, nebo mají přežít zavření prohlížeče?

- **Epic:** přehledy · **Dotčené US:** [#175](https://github.com/applifting-vsecourse/team-1/issues/175) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Zápis 27. 10. dal ticket do backlogu.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/175): „Stačí pamatovat filtry jen v rámci session, nebo mají přežít zavření prohlížeče?“
- **Priorita:** P3 – Zápis 27. 10.: do backlogu.

<a id="q-pri-01"></a>

### Q-PRI-01 – Jaké výjimky dnes děláš (stálí účastníci, tým, sourozenci)?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Odpověď PM v PR #232: není prioritní, nebrání mergi.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/28): „**Otevřená otázka na PO:** F-16 – jaké výjimky dnes děláš (stálí účastníci, tým, sourozenci)?“
  - [PR #232, bod 5](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Priorita:** P3 – PM 31. 10.: otázka není prioritní a nebrání mergi #232.

<a id="q-pri-02"></a>

### Q-PRI-02 – Jaká lhůta na zaplacení platí pro náhradníka potvrzeného na poslední chvíli, např. týden před akcí?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-31](https://github.com/applifting-vsecourse/team-1/issues/31) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/31): „**Otevřená otázka na PO:** F-18 – jaká lhůta na zaplacení platí pro náhradníka potvrzeného na poslední chvíli, např. týden před akcí?“
- **Priorita:** P1 – Vyhodnocování a náhradníci jsou hlavní priorita PO; lhůta pro náhradníka na poslední chvíli není určena.

<a id="q-pri-03"></a>

### Q-PRI-03 – Platí pro změnu termínu stejné storno podmínky jako pro odhlášku (US-47)?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-32](https://github.com/applifting-vsecourse/team-1/issues/32) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/32): „F-19 – platí pro změnu termínu stejné storno podmínky jako pro odhlášku (US-47)?“
- **Priorita:** P1 – Odhláška a změna termínu jsou v návrhu PO; pravidla stornování nejsou určena.

<a id="q-pri-04"></a>

### Q-PRI-04 – Platí pravidlo „odhlášená přihláška se nepočítá do kontroly duplicity“ i pro termín zrušený organizátorem při vyhodnocení (stav „Zrušená“)?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-32](https://github.com/applifting-vsecourse/team-1/issues/32), [#160](https://github.com/applifting-vsecourse/team-1/issues/160) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Autor komentáře navrhuje „ano“.
- **Zdroje:**
  - [komentář k issue](https://github.com/applifting-vsecourse/team-1/issues/32): „platí totéž pro termín zrušený organizátorem při vyhodnocení (stav „Zrušená“ ve `SLOVNIK.md`)? Podle mě ano.“
  - [PROJEKT.md §9, 26. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/PROJEKT.md#9-rozhodnutí): „Duplicitní přihláška (#160, US-23). Odeslání odmítne (409 APPLICATION_DUPLICATE) …“
- **Priorita:** P2 – Drobné pravidlo kontroly duplicity; autor navrhuje odpověď „ano“.

<a id="q-pri-05"></a>

### Q-PRI-05 – Vyhodnocuje se každý týden zvlášť? Navrhujeme ano.

- **Epic:** přihlašování na akce · **Dotčené US:** [US-82](https://github.com/applifting-vsecourse/team-1/issues/82) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Poznámka:** Board: „Akce = jeden celek s více termíny, každý termín se vyhodnocuje zvlášť.“ (PROJEKT.md §9).
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/82): „**Otevřená otázka na PO:** F-15 – vyhodnocuje se každý týden zvlášť? Navrhujeme ano.“
  - [PROJEKT.md §9, board](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/PROJEKT.md#9-rozhodnutí): „Akce = jeden celek s více termíny, každý termín se vyhodnocuje zvlášť.“
- **Uzavřeno, protože:** Board: „Akce = jeden celek s více termíny, každý termín se vyhodnocuje zvlášť.“ (PROJEKT.md §9).

<a id="q-pri-06"></a>

### Q-PRI-06 – Ruční, nebo automatické schvalování přihlášek a e-mailů?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-82](https://github.com/applifting-vsecourse/team-1/issues/82) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Poznámka:** PROJEKT.md §9, 23. 10.: organizátor si nastaví ruční, nebo automatické vyhodnocování. Zařazeno k US-82 jen kvůli epicu.
- **Zdroje:**
  - [zápis 22. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-22-status.md): „Produkt má mít automatické schvalování dle kapacity i ruční vyhodnocení organizátorem; v dokumentaci to není jasné.“
  - [PROJEKT.md §9, 23. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/PROJEKT.md#9-rozhodnutí): „Vyhodnocování přihlášek: organizátor si nastaví ruční, nebo automatické.“
- **Uzavřeno, protože:** PROJEKT.md §9, 23. 10.: organizátor si nastaví ruční, nebo automatické vyhodnocování. Zařazeno k US-82 jen kvůli epicu.

<a id="q-pri-07"></a>

### Q-PRI-07 – Má změna termínu nebo odhláška proběhnout hned, nebo ji organizátor nejdřív schválí (kvůli kapacitě a storno podmínkám)?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-84](https://github.com/applifting-vsecourse/team-1/issues/84) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Návrh PO z 28. 10. říká: účastník si sám opraví údaje, změní termín nebo se odhlásí; když už běží storno podmínky, schvaluje organizátor. Nerozhoduje, co je „hned“ a co „po schválení“ před začátkem storno podmínek.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/84): „**Otevřená otázka na PO:** F-20 – má změna termínu nebo odhláška proběhnout hned, nebo ji organizátor nejdřív schválí (kvůli kapacitě a storno podmínkám)?“
- **Priorita:** P1 – Účastník si sám mění termín a odhlašuje se (návrh PO); chybí pravidlo hned / po schválení.

<a id="q-pri-08"></a>

### Q-PRI-08 – Jak se účastník vrací do aplikace? (odpověď: nápady nechává PO na týmu)

- **Epic:** přihlašování na akce · **Dotčené US:** [US-84](https://github.com/applifting-vsecourse/team-1/issues/84) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Poznámka:** Status s PO 28. 10.: důvod k návratu účastníka (úprava přihlášky, platba, kontakt na organizátora), nápady nechává PO na týmu. Zařazeno k US-84 jen kvůli epicu.
- **Zdroje:**
  - [zápis 14. 10.](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-14-status-s-po.md): „Otevřená otázka: jak ho motivovat k návratu do platformy?“
  - [zápis 28. 10., Priority dalšího sprintu](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-28-status-s-po.md): „Účastník potřebuje důvod se do aplikace vracet (úprava přihlášky, platba, kontakt na organizátora); nápady nechává na týmu.“
- **Uzavřeno, protože:** Status s PO 28. 10.: důvod k návratu účastníka (úprava přihlášky, platba, kontakt na organizátora), nápady nechává PO na týmu. Zařazeno k US-84 jen kvůli epicu.

<a id="q-pri-09"></a>

### Q-PRI-09 – Používáš okna pro podání přihlášek podle věku či jiných údajů?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-87](https://github.com/applifting-vsecourse/team-1/issues/87) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/87): „**Otevřená otázka na PO:** F-59 – používáš okna pro podání přihlášek podle věku či jiných údajů?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-pri-10"></a>

### Q-PRI-10 – Kdo je smí vidět, jak dlouho se uchovávají a má o záznamu účastník vědět? Potřebuješ to na kempu?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-88](https://github.com/applifting-vsecourse/team-1/issues/88) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/88): „**Otevřená otázka na PO:** F-60 – kdo je smí vidět, jak dlouho se uchovávají a má o záznamu účastník vědět? Potřebuješ to na kempu?“
- **Priorita:** P3 – GDPR má podle PO 28. 10. nízkou prioritu.

<a id="q-pri-11"></a>

### Q-PRI-11 – Má se formát data narození řídit jazykem aplikace, nebo jazykem systému (a co na jiných zařízeních)?

- **Epic:** přihlašování na akce · **Dotčené US:** [#177](https://github.com/applifting-vsecourse/team-1/issues/177) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/177): „Má se formát řídit jazykem aplikace (cs / en), nebo jazykem systému? V angličtině je MM/DD/YYYY pro část uživatelů správně. / Platí totéž pro pole data v dialogu termínu? / Jak se to chová na dalších zařízeních a prohlížečích?“
- **Priorita:** P2 – Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí.

<a id="q-pri-12"></a>

### Q-PRI-12 – Je v angličtině správný formát data narození DD/MM/YYYY (en-GB), nebo MM/DD/YYYY?

- **Epic:** přihlašování na akce · **Dotčené US:** [#177](https://github.com/applifting-vsecourse/team-1/issues/177) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Souvisí s Q-PRI-11 (formát podle jazyka aplikace).
- **Zdroje:**
  - [PR #226, nejasnosti k byznys pravidlům](https://github.com/applifting-vsecourse/team-1/pull/226)
- **Priorita:** P2 – Otevřené PR #226 staví en-GB; čeká na potvrzení.

<a id="q-pri-13"></a>

### Q-PRI-13 – Má u náhradníka na detailu přihlášky zůstat text „0 Kč do potvrzení“, nebo se změnit (např. „zatím nic k úhradě“)?

- **Epic:** přihlašování na akce · **Dotčené US:** [#225](https://github.com/applifting-vsecourse/team-1/issues/225) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #227, nejasnosti k byznys pravidlům](https://github.com/applifting-vsecourse/team-1/pull/227)
- **Priorita:** P3 – Drobný text; PR #227 ho nechal beze změny.

<a id="q-pri-14"></a>

### Q-PRI-14 – Má se do diagramu doplnit přechod Potvrzená → Náhradník (organizátor), jak říká ticket US-28?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) · **Stav:** rozhodnuto, nezapsáno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #232](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Priorita:** P1 – Blokovalo kritérium US-28; rozhodnuto, zbývá zapsat do modelů.
- **Rozhodnutí:** Ano, systém to má umožnit. (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632))
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: ceka, přechod Potvrzená s dluhem → Náhradník
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: ceka, zkontrolovat, zda přechod platí i v auto režimu
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: ceka, řádek e-mailu o tomto přechodu

<a id="q-pri-15"></a>

### Q-PRI-15 – Smí organizátor zrušit náhradníka kdykoli, nebo jen automaticky první den termínu?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) · **Stav:** rozhodnuto, nezapsáno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #232](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Priorita:** P1 – Rozpor ticket × diagram; rozhodnuto, zbývá zapsat.
- **Rozhodnutí:** Je v pořádku, organizátor může zrušit náhradníka kdykoli. (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632))
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: ceka, Náhradník → Zrušená i organizátorem
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: ceka, zkontrolovat v auto režimu
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: ceka, řádek 6 platí jen pro první den, doplnit řádek pro zrušení organizátorem

<a id="q-pri-16"></a>

### Q-PRI-16 – Stačí, že přechody ze stavu K vyhodnocení doplní US-102, aby se kritérium US-28 uzavřelo?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #232](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Priorita:** P2 – Stav K vyhodnocení v kódu není.
- **Rozhodnutí:** Souhlas, přechody doplní US-102 (#195). (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632))
- **Navazující ticket:** [US-102 (#195): ověřit, že kritéria obsahují přechody z K vyhodnocení](https://github.com/applifting-vsecourse/team-1/issues/195)

<a id="q-pri-17"></a>

### Q-PRI-17 – Stačí v US-28 vědomé potvrzení nad kapacitu, když přistýlka (US-80) ještě neexistuje?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #232](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Priorita:** P2 – Kritérium dovoluje „přistýlku nebo vědomé potvrzení“.
- **Rozhodnutí:** Souhlas, stačí vědomé potvrzení; přistýlka přijde s US-80. (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632))

<a id="q-pri-18"></a>

### Q-PRI-18 – Má se blok „Stav v termínech“ (detail přihlášky, dialog změny stavu, varování o kapacitě) dokreslit ve Figmě před mergem #232?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-28](https://github.com/applifting-vsecourse/team-1/issues/28) · **Stav:** uzavřeno · **Čeká na:** `design`
- **Zdroje:**
  - [PR #232](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632)
- **Priorita:** P2 – Rámec ve Figmě neexistuje; nebrání mergi.
- **Rozhodnutí:** Merge neblokuje; mergnout a UI/UX dolaďovat zpětně ticketem enhancement. (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/232#issuecomment-6535280632))
- **Navazující ticket:** enhancement: UI/UX bloku „Stav v termínech“ + rámce ve Figmě (k založení)

<a id="q-pri-19"></a>

### Q-PRI-19 – Sbírá se telefon ve formuláři přihlášky a v jaké story? (US-30 ho chce u náhradníka i s vytočením jedním klepnutím)

- **Epic:** přihlašování na akce · **Dotčené US:** [US-30](https://github.com/applifting-vsecourse/team-1/issues/30) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #234](https://github.com/applifting-vsecourse/team-1/pull/234)
- **Priorita:** P2 – Přihláška telefon neukládá; kritéria US-30 s telefonem zůstávají nesplněná.
- **Rozhodnutí:** Neřešit v tomto PR; mergnout, telefon sbírat novým ticketem (někdy by tam určitě měl být). (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/234))
- **Navazující ticket:** nový ticket: sběr telefonů od účastníků (+ tel: odkaz v pořadníku) (k založení)
- **Navazující ticket:** [upravit kritéria US-30 v issue](https://github.com/applifting-vsecourse/team-1/issues/30)

<a id="q-pri-20"></a>

### Q-PRI-20 – Od jaké hodiny se ruší náhradník první den termínu?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) · **Stav:** rozhodnuto, nezapsáno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #236](https://github.com/applifting-vsecourse/team-1/pull/236)
- **Priorita:** P2 – Dokumenty časové pásmo neuvádějí; implementace používá půlnoc Europe/Prague.
- **Rozhodnutí:** Zatím půlnoc českého času; platforma zatím není mezinárodní. Detaily procesu zjistí PM od PO, případně vznikne ticket enhancement. (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/236))
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: ceka, Náhradník → Zrušená: půlnoc Europe/Prague prvního dne termínu
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.yaml`: ceka, totéž
- **Navazující ticket:** zjistit od PO detaily rušení náhradníků; případně enhancement (k založení)

<a id="q-pri-21"></a>

### Q-PRI-21 – Co se stane s náhradníky (a ostatními přihláškami) ve zrušeném termínu akce?

- **Epic:** přihlašování na akce · **Dotčené US:** [US-106 (#199)](https://github.com/applifting-vsecourse/team-1/issues/199) · **Stav:** rozhodnuto, nezapsáno · **Čeká na:** `pm`
- **Zdroje:**
  - [PR #236](https://github.com/applifting-vsecourse/team-1/pull/236)
- **Priorita:** P1 – Dokumenty to neříkají; úloha je nechává beze změny. Kritická a nevratná akce.
- **Rozhodnutí:** Při zrušení termínu se ruší všichni účastníci ve všech stavech. UX má organizátora dostatečně upozornit na kritickou a nevratnou akci. (pm, 2026-10-31, [zdroj](https://github.com/applifting-vsecourse/team-1/pull/236))
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/`: ceka, chybí proces zrušení termínu akce (US-13)
- **Dokumentace:** `docs/procesy/zpracovani-prihlasky/EMAILY.md`: ceka, chybí e-mail při zrušení termínu
- **Navazující ticket:** story: zrušení termínu zruší všechny přihlášky ve všech stavech + varování v UX (k založení)

<a id="q-tec-01"></a>

### Q-TEC-01 – Kolik lidí loni podalo přihlášku v první hodině? Jak předejít selhání systému ten večer?

- **Epic:** technický základ · **Dotčené US:** [US-74](https://github.com/applifting-vsecourse/team-1/issues/74) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/74): „**Otevřená otázka na PO:** F-54 – kolik lidí loni podalo přihlášku v první hodině? Jak předejít selhání systému ten večer?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-tec-02"></a>

### Q-TEC-02 – Jakou ztrátu dat je PO ochoten unést (hodina, den)?

- **Epic:** technický základ · **Dotčené US:** [US-76](https://github.com/applifting-vsecourse/team-1/issues/76) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/76): „**Otevřená otázka na PO:** F-55 – jakou ztrátu dat je PO ochoten unést (hodina, den)?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-tec-03"></a>

### Q-TEC-03 – Jak dlouho se údaje po akci uchovávají? Viz #164.

- **Epic:** technický základ · **Dotčené US:** [US-78](https://github.com/applifting-vsecourse/team-1/issues/78) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/78): „**Otevřená otázka na PO:** F-56 – jak dlouho se údaje po akci uchovávají? Viz [#164](https://github.com/applifting-vsecourse/team-1/issues/164).“
- **Priorita:** P3 – GDPR má podle PO 28. 10. nízkou prioritu.

<a id="q-tec-04"></a>

### Q-TEC-04 – Potřebuješ do systému stará data, nebo ročník 2027 začne načisto?

- **Epic:** technický základ · **Dotčené US:** [US-85](https://github.com/applifting-vsecourse/team-1/issues/85) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/85): „**Otevřená otázka na PO:** F-57 – potřebuješ do systému stará data, nebo ročník 2027 začne načisto?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-tec-05"></a>

### Q-TEC-05 – Přejmenovat typ účtu `PARTICIPANT` na `APPLICANT`?

- **Epic:** technický základ · **Dotčené US:** – · **Stav:** otevřeno · **Čeká na:** `tech-lead`
- **Poznámka:** Převzato ze sekce „Mimo product manažera“ původního dokumentu.
- **Zdroje:**
  - [SLOVNIK.md, Rozpory mezi zdroji](https://github.com/applifting-vsecourse/team-1/blob/main/docs/SLOVNIK.md#rozpory-mezi-zdroji)
- **Priorita:** P3 – Rozpor mezi zdroji ve SLOVNIK.md; rozhodnout s tech leadem.

<a id="q-tec-06"></a>

### Q-TEC-06 – Připojit Figma konektor a převzít tokeny do `global.css`.

- **Epic:** technický základ · **Dotčené US:** – · **Stav:** otevřeno · **Čeká na:** `tech-lead`
- **Poznámka:** Převzato ze sekce „Mimo product manažera“ původního dokumentu.
- **Zdroje:**
  - [PROJEKT.md §12](https://github.com/applifting-vsecourse/team-1/blob/main/docs/PROJEKT.md#12-otevřené-body)
- **Priorita:** P3 – Otevřený bod v PROJEKT.md §12; vlastník je tech lead.

<a id="q-tec-07"></a>

### Q-TEC-07 – Dopad zneplatnění magic linků na E2E (`magic-link.spec.ts`, `set-password.spec.ts`) a zápis pravidla do PROJEKT.md.

- **Epic:** technický základ · **Dotčené US:** [#127](https://github.com/applifting-vsecourse/team-1/issues/127) · **Stav:** otevřeno · **Čeká na:** `tech-lead`
- **Poznámka:** Převzato ze sekce „Mimo product manažera“ původního dokumentu.
- **Zdroje:**
  - [issue #127](https://github.com/applifting-vsecourse/team-1/issues/127)
- **Priorita:** P3 – Navazuje na #127; technická část, nejde o rozhodnutí PM.

<a id="q-uby-01"></a>

### Q-UBY-01 – Brief uvádí rozdělení do pokojů mezi nutnostmi pro 7. 2., v rozhovoru ale pokoje řešíte na místě. Platí tedy Nice to have?

- **Epic:** ubytování · **Dotčené US:** [US-35](https://github.com/applifting-vsecourse/team-1/issues/35) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/35): „**Otevřená otázka na PO:** F-21 – brief uvádí rozdělení do pokojů mezi nutnostmi pro 7. 2., v rozhovoru ale pokoje řešíte na místě. Platí tedy Nice to have?“
- **Priorita:** P2 – PO chce interaktivní prvek u kapacit ubytování; samotné přiřazování na lůžka je ale označeno jako nice to have.

<a id="q-uby-02"></a>

### Q-UBY-02 – Je ještě jiné pravidlo, které má systém hlídat?

- **Epic:** ubytování · **Dotčené US:** [US-37](https://github.com/applifting-vsecourse/team-1/issues/37) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/37): „**Otevřená otázka na PO:** F-22 – je ještě jiné pravidlo, které má systém hlídat?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-uby-03"></a>

### Q-UBY-03 – Mají být zájmena v přihlášce jako nepovinné pole? Organizátor LARP tábora je plánuje do přihlášek přidat.

- **Epic:** ubytování · **Dotčené US:** [US-38](https://github.com/applifting-vsecourse/team-1/issues/38) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/38): „**Otevřená otázka na PO:** F-23 – mají být zájmena v přihlášce jako nepovinné pole? Organizátor LARP tábora je plánuje do přihlášek přidat.“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-uby-04"></a>

### Q-UBY-04 – Necháme to až po rozdělení do pokojů (US-35)?

- **Epic:** ubytování · **Dotčené US:** [US-39](https://github.com/applifting-vsecourse/team-1/issues/39) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/39): „**Otevřená otázka na PO:** F-24 – necháme to až po rozdělení do pokojů (US-35)?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-uct-01"></a>

### Q-UCT-01 – Mají e-maily chodit i samotnému účastníkovi, nebo jen přihlašovateli? Navrhujeme oběma.

- **Epic:** účty · **Dotčené US:** [US-05](https://github.com/applifting-vsecourse/team-1/issues/5) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/5): „**Otevřená otázka na PO:** F-02 – mají e-maily chodit i samotnému účastníkovi, nebo jen přihlašovateli? Navrhujeme oběma.“
- **Priorita:** P2 – Zbývající flow přihlášky; otázka, komu chodí e-maily.

<a id="q-uct-02"></a>

### Q-UCT-02 – Od kolika let může účastník podat přihlášku sám? Platí to pro všechny akce stejně, nebo si to nastaví organizátor?

- **Epic:** účty · **Dotčené US:** [US-07](https://github.com/applifting-vsecourse/team-1/issues/7) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/7): „**Otevřená otázka na PO:** F-02 – od kolika let může účastník podat přihlášku sám? Platí to pro všechny akce stejně, nebo si to nastaví organizátor?“
- **Priorita:** P2 – Zbývající flow přihlášky; hranice věku pro samostatnou přihlášku.

<a id="q-uct-03"></a>

### Q-UCT-03 – Má si nová organizace založit svůj profil v systému sám, nebo mu ho připravíme my?

- **Epic:** účty · **Dotčené US:** [US-08](https://github.com/applifting-vsecourse/team-1/issues/8) · **Stav:** uzavřeno · **Čeká na:** `pm`
- **Poznámka:** Nepřímá odpověď: status s PO 28. 10. řadí „založení organizace formou self-onboardingu“ do odsouhlaseného rozsahu sprintu.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/8): „**Otevřená otázka na PO:** F-03 – má si nová organizace založit svůj profil v systému sám, nebo mu ho připravíme my?“
  - [zápis 28. 10., Priority dalšího sprintu](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-28-status-s-po.md): „Do odsouhlaseného rozsahu patří také … založení organizace formou self-onboardingu“
- **Uzavřeno, protože:** Nepřímá odpověď: status s PO 28. 10. řadí „založení organizace formou self-onboardingu“ do odsouhlaseného rozsahu sprintu.

<a id="q-uct-04"></a>

### Q-UCT-04 – Organizace: musí ji mít každý organizátor, nebo může pořádat akce sám?

- **Epic:** účty · **Dotčené US:** [US-08](https://github.com/applifting-vsecourse/team-1/issues/8) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Zařazeno k US-08 kvůli epicu; souvisí s #69 a #186.
- **Zdroje:**
  - [zápis 27. 10., Ke schválení PO](https://github.com/applifting-vsecourse/team-1/blob/31b4fc25e25afa265d1812a9f8538d081af84265/docs/zapisy/2026-10-27-status.md#L80-L86): „Organizace: musí ji mít každý organizátor, nebo může pořádat sám? Dopady na class model a UX (podklad od Kuby).“
- **Priorita:** P1 – Self-onboarding organizace je v rozsahu sprintu 3; otázka určuje dopad na model a UX.

<a id="q-uct-05"></a>

### Q-UCT-05 – Potřebují lidé v administraci rozdílná oprávnění (např. pokladník jen platby), nebo pro začátek stačí, že všichni vidí všechno?

- **Epic:** účty · **Dotčené US:** [US-11](https://github.com/applifting-vsecourse/team-1/issues/11) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/11): „**Otevřená otázka na PO:** F-05 – potřebují lidé v administraci rozdílná oprávnění (např. pokladník jen platby), nebo pro začátek stačí, že všichni vidí všechno?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-uct-06"></a>

### Q-UCT-06 – Zabírají členové organizačního týmu lůžka v kapacitě akce? Platí za účast?

- **Epic:** účty · **Dotčené US:** [US-93](https://github.com/applifting-vsecourse/team-1/issues/93) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/93): „**Otevřená otázka na PO:** F-67 – zabírají členové organizačního týmu lůžka v kapacitě akce? Platí za účast?“
- **Priorita:** P3 – Startovní brífink (F-xx) nebo mimo rozsah sprintu 3; nic na ní nestojí.

<a id="q-uct-07"></a>

### Q-UCT-07 – Má nový magic link zneplatnit jen dříve vydané nepoužité odkazy, nebo i aktivní session?

- **Epic:** účty · **Dotčené US:** [#127](https://github.com/applifting-vsecourse/team-1/issues/127) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Poznámka:** Autor navrhuje jen odkazy.
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/127): „Zneplatňovat jen nepoužité odkazy, nebo i aktivní session? (navrhuji jen odkazy)“
- **Priorita:** P2 – Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí.

<a id="q-uct-08"></a>

### Q-UCT-08 – Je pro klienta v pořádku, že obecná chybová hláška loginu zůstává bez nápovědy, jen s radou zkontrolovat e-mail z přihlášky?

- **Epic:** účty · **Dotčené US:** [#187](https://github.com/applifting-vsecourse/team-1/issues/187) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/187): „Dotaz na Adama: Je pro klienta v pořádku, že obecná hláška zůstává bez nápovědy, jen s radou zkontrolovat e-mail z přihlášky?“
- **Priorita:** P2 – Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí.

<a id="q-uct-09"></a>

### Q-UCT-09 – Mají se v textech důsledně používat slova „přihlašovatel“ a „účastník“ podle slovníku, i když rodič rozdíl nepozná?

- **Epic:** účty · **Dotčené US:** [#187](https://github.com/applifting-vsecourse/team-1/issues/187) · **Stav:** otevřeno · **Čeká na:** `pm`
- **Zdroje:**
  - [issue](https://github.com/applifting-vsecourse/team-1/issues/187): „Dotaz na Adama: Mají se v textech důsledně používat slova „přihlašovatel“ a „účastník“ podle slovníku, i když rodič rozdíl nepozná?“
- **Priorita:** P2 – Rozpracovaná oprava nebo úprava v běžícím flow přihlášek a účtů; nic neblokuje, ale brzy se na to narazí.
