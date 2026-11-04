# Dokončení e-mailů Togeny

Plán zahájen 3. 11. 2026. Výstupem inventury je business katalog transakčních e-mailů přihlášek a účtů. Katalog popisuje požadovanou komunikaci; vývoj na něj navazuje až po schválení. Hromadné kampaně nejsou součástí.

## Postup

1. **Business inventura:** pro každou zprávu určit účel, business událost, příjemce, rozsah zprávy, povinné informace, očekávanou reakci a jazyk. Zachytit i situace, kdy e-mail neodchází. Výstup: [KATALOG.md](KATALOG.md).
2. **Vyjasnění a schválení katalogu:** potvrdit úplnost komunikace a uzavřít otázky, které mění její význam. Existující kód slouží jen jako orientační informace o pokrytí, ne jako zdroj nových business pravidel.
3. **Obsah:** schválit předmět, krátký náhled zprávy, nadpis, tělo, proměnné údaje, hlavní akci a patičku v CS/EN. Výstup: [TEXTY.md](TEXTY.md). Texty schválil Adam 3. 11. 2026 včetně UX revize. Další jazyková revize se u školního projektu neprovádí.
4. **Design:** sjednotit vizuální podobu a připravit ukázky jednoduché zprávy, souhrnu více přihlášek, změny termínů a bezpečnostního upozornění. Ověřit srozumitelnost na mobilu i desktopu.
5. **Předání vývoji:** schválený katalog, texty a design převést na vývojové úkoly. Technický návrh a realizace nejsou předmětem inventury.
6. **Business akceptace:** na reprezentativních situacích ověřit, že správný příjemce dostává správné sdělení ve správném jazyce a počtu zpráv. Potvrdit obsah, vzhled a doručení.

## Hranice inventury

- Řeší, proč, kdy, komu a co sdělit. Nedefinuje architekturu ani způsob sestavení zpráv.
- U plateb určuje pouze, kdy má příjemce dostat platební údaje nebo potvrzení zaplacení a jak má sdělení pochopit. Výpočty částek, konstrukce variabilních symbolů a účtování patří do platební domény, ne sem.
- Přípustná je stručná informace, zda bylo nalezeno odpovídající odesílání nebo jen šablona, s odkazem na kód. Nenahrazuje akceptaci.
- Nemění business pravidla, aplikaci, GitHub ani Figmu a neodesílá zákaznické e-maily.

## Návaznosti

- [EMAILY.md](../procesy/zpracovani-prihlasky/EMAILY.md) a procesní modely zůstávají zdrojem pravidel přihlášek. Katalog je jejich komunikační pohled; rozpory se musí vyjasnit, ne potichu přepsat.
- [#260](https://github.com/applifting-vsecourse/team-1/issues/260) řeší texty a design přihlašovatelských e-mailů. Další vývojové úkoly se odvodí až ze schváleného rozsahu.
- [SYSTEM.md](SYSTEM.md) popisuje business správu katalogu a postup přidání nové komunikace, ne technické řešení.

## Kdy je inventura hotová

- Každá relevantní business situace má přiřazený e-mail, nebo výslovně uvedeno, že žádný neodchází.
- Každý typ má účel, událost, příjemce, rozsah, obsah, očekávanou reakci a jazyk.
- Je rozlišeno platné pravidlo, návrh a otevřená otázka.
- PM potvrdí úplnost a význam katalogu. Neuzavřené otázky jsou označené a nesmí být zaměněny za schválený požadavek.

## Stav (3. 11. 2026)

| Krok | Stav |
| --- | --- |
| 1. Business inventura | Hotovo, [KATALOG.md](KATALOG.md); šest rozhodnutí PM zapracováno. |
| 2. Schválení katalogu | Rozhodnutí PM zapracována do modelů a registru. Čeká už jen na finální potvrzení úplnosti. |
| 3. Obsah | Hotovo. Texty CS/EN schváleny Adamem; další revize ani skutečné kontakty se neřeší (školní projekt, `organizator@togena.com` a `support@togena.com` zůstávají fiktivní). |
| 4. Design | Hotovo k schválení (5. 11. 2026). Ve Figmě (Design system, stránka „HF / 09 E-maily · nový design“) je 24 e-mailů v aktuálním designu podle [FIGMA-REMAKE.md](../FIGMA-REMAKE.md) (primární `#007f72`, Inter, DS komponenty), každý v desktopu a na mobilu: přijetí přihlášky (E01–E04), změny stavu a zrušení (E05–E13), platby včetně nového e-mailu č. 16 (E14–E16), účet a bezpečnostní upozornění (E17–E20) a anglické varianty E02, E05, E13 a E20. Texty vychází z [TEXTY.md](TEXTY.md). Rozhodnuto: stačí čtyři anglické varianty a e-mail č. 5 nemá samostatnou variantu „Uvolnilo se lůžko“. Původní e-maily jsou archivované na stránce „ARCHIV / E-maily před úpravou 4. 11.“. Všechny sekce jsem prošel vizuálně a v rámcích není oříznutý text ani překryv. Čeká na schválení designu Adamem. Kód šablon se zatím nemění. |
| 5. Předání vývoji | Nezahájeno, závisí na krocích 2 a 4. Šablony v `apps/backend/src/core/email/templates/` stále používají starý vzhled (`#006c60`, Manrope) a odkazy na archivované Figma rámce. |
| 6. Business akceptace | Nezahájeno. |

Hotovo od posledního stavu:

- Rozhodnutí z katalogu jsou promítnutá do [EMAILY.md](../procesy/zpracovani-prihlasky/EMAILY.md) (nový e-mail č. 16, výzva jednou, refund, magic link, kontakty), do stavových a procesních modelů obou režimů (přechod zaplacená → s dluhem po opravě platby) a do registru jako D-099 až D-104.
- Tickety upraveny: #46 (jedna výzva, ručně nebo automaticky), #205 (návrat k dluhu a e-mail č. 16), komentář v #178 (magic link). Q-PLA-03 přeformulována.

Zbývá před předáním vývoji:

- Rozhodnout, kam patří text a design e-mailu č. 16: navrženo přidat do [#260](https://github.com/applifting-vsecourse/team-1/issues/260); do ticketu zatím nezapsáno. Návrh e-mailu je ve Figmě jako E16 (`PAYMENT_CORRECTED`).
- Schválit design e-mailů ve Figmě (krok 4). Ticket #260 zatím mluví o starých rámcích S17; po schválení ho odkázat na stránku „HF / 09 E-maily · nový design“.
- Před zapojením EVENT_TERM_CANCELLED potvrdit soulad věty o vrácení plateb s pravidly rušení termínů (D-080).
- Potvrzení náhradníka po uvolnění lůžka (APP_CONFIRMED, č. 5) není business otázka: procesní modely ho mají v obou režimech (ruční: organizátor potvrdí; automatické: systém potvrdí v pořadí přijetí). Podle orientačního pokrytí v kódu odesílání nenalezeno, jde tedy o mezeru ve vývoji. Rozhodnuto: e-mail nemá samostatnou variantu textu „Uvolnilo se lůžko“, sděluje jen potvrzení účasti a platební údaje jako č. 2.
- Vývoj vyřadí šablonu obecného ověření e-mailu (`verify-email`), D-102.
- Otevřená otázka na PO: co po jediné výzvě bez reakce (Q-PLA-03).
