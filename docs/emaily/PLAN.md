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
| 2. Schválení katalogu | Čeká na finální potvrzení PM (úplnost a význam). |
| 3. Obsah | Hotovo. Texty CS/EN schváleny Adamem; další revize ani skutečné kontakty se neřeší (školní projekt, `organizator@togena.com` a `support@togena.com` zůstávají fiktivní). |
| 4. Design | Nezahájeno. Další krok: náhledy jednoduché zprávy, souhrnu přihlášek, změny více termínů a bezpečnostního upozornění; srovnání s Figmou. |
| 5. Předání vývoji | Nezahájeno, závisí na krocích 2 a 4. |
| 6. Business akceptace | Nezahájeno. |

Před předáním vývoji zbývá:

- Promítnout nová rozhodnutí (magic link místo „prvního hesla“, výzva po splatnosti jen na požadavek organizátora, nový PAYMENT_CORRECTED, platební údaje v opravě platby, vrácení plateb) do [EMAILY.md](../procesy/zpracovani-prihlasky/EMAILY.md), procesních modelů a registru rozhodnutí. Dosud neproběhlo; dělá se přes skill `model-update` a `business-impact-check`, jen na pokyn PM.
- Před zapojením EVENT_TERM_CANCELLED potvrdit soulad věty o vrácení plateb s pravidly rušení termínů.
- Vyjasnit chybějící automatické potvrzení náhradníka po uvolnění lůžka (APP_CONFIRMED, varianta z náhradníka) – podle orientačního pokrytí v kódu nenalezeno.
