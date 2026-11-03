# Správa business katalogu e-mailů

Tento dokument vymezuje odpovědnosti a postup změny komunikace. Nenavrhuje technickou architekturu; ta vznikne v navazujícím vývoji podle schválených požadavků.

## Co je zdrojem čeho

| Podklad | Co určuje |
| --- | --- |
| Procesní a stavové modely, business rozhodnutí | Co se v doméně děje a jaká pravidla platí. |
| [Business katalog](KATALOG.md) | Kterou událost komunikovat, komu, proč, v jakém rozsahu a s jakou očekávanou reakcí. |
| [Texty](TEXTY.md) | Jak konkrétně sdělení zní v češtině a angličtině. |
| Schválené vizuální návrhy | Jak zprávy vypadají a jak se v nich příjemce orientuje. |
| Vývojové úkoly a aplikace | Jak se požadovaná komunikace realizuje. |

Rozpor mezi zdroji je podnět k vyjasnění, ne důvod přepsat business požadavek podle aktuálního kódu. Katalog nepopisuje výpočty plateb, konstrukci variabilních symbolů ani technické sestavení a doručování zpráv.

## Odpovědnosti

- PM odpovídá za úplnost katalogu, význam sdělení a schválení českého obsahu.
- Určený jazykový reviewer schvaluje anglický obsah a konzistentní terminologii.
- Designér připravuje jednotný vzhled s ohledem na různou složitost zpráv a čitelnost na mobilu.
- Vývoj navrhuje a realizuje technické řešení schválené komunikace; nepotvrzené business otázky neřeší odhadem.
- Business akceptace ověřuje skutečné chování vůči katalogu, nikoli pouze existenci šablony.

## Přidání nebo změna e-mailu

1. Popsat business potřebu: co se stalo, kdo o tom potřebuje vědět a co má po přečtení vědět nebo udělat.
2. Prověřit stávající katalog: jde o nový typ, variantu, nebo změnu již existujícího sdělení?
3. Doplnit událost, příjemce, povinný obsah, očekávanou reakci, jazyk, rozsah jedné zprávy a případy bez odeslání. Uvést zdroj pravidla a otevřené otázky.
4. Schválit změnu katalogu. Pokud mění business pravidla, nejprve sjednotit příslušné modely a rozhodnutí.
5. Schválit texty a vizuální ukázky. Zvlášť prověřit finanční a bezpečnostní sdělení, aby příjemci neslibovala jiný výsledek, než jaký platí.
6. Předat požadavek vývoji se scénáři business akceptace. Technické řešení není součástí schválení inventury.
7. Po realizaci ověřit komunikaci a zaznamenat výsledek. Udržovat soulad katalogu, textů a skutečného chování při dalších změnách.

## Jednotný komunikační styl

- Česká komunikace používá vykání a slovník Togeny.
- Zpráva jednoznačně odlišuje přihlašovatele od účastníka a přihlášku od účasti v konkrétním termínu.
- Předmět a nadpis vystihují skutečný výsledek. Přijetí formuláře není potvrzením účasti; žádost o změnu není jejím dokončením.
- Vzhled sjednocuje značku, typografii, hlavní akci a patičku. Jednoduchá bezpečnostní zpráva a souhrn více účastníků nemusí mít stejnou strukturu.
- Platební údaje se uvádějí jen v situacích povolených business pravidly. Zprávy nevysvětlují interní výpočty a nevytvářejí nové platební podmínky.
- Příjemce musí vědět, zda má jednat, vyčkat, nebo jen vzít informaci na vědomí. Přihlášky, účast a platby řeší organizátor akce; přihlášení, heslo a zabezpečení účtu podpora Togeny. Patička uvádí příslušný kontakt a odpovědi na zprávu směřují stejnému příjemci.
- Změnové zprávy neopakují nezměněné termíny. Potvrzení odhlášení zahrne i odebraný termín.
- Samostatné obecné ověření adresy se nepožaduje. Při založení účtu přihláškou jde příjemci magic link v potvrzovacím e-mailu.

## Business akceptace po vývoji

- Pro danou událost odejde správný druh zprávy správnému příjemci; v situaci bez komunikace neodejde žádná.
- Příjemce pozná akci, účastníka a dotčené termíny, pokud jsou pro zprávu relevantní.
- Zpráva má správný jazyk a neodporuje aktuálnímu výsledku business události.
- Více účastníků a současné změny více termínů respektují rozsah zpráv stanovený katalogem.
- Povinné informace a hlavní akce jsou srozumitelné; zpráva neobsahuje nepovolené platební údaje ani nepravdivé přísliby.
- Obsah a vzhled odpovídají schválenému návrhu; zpráva je čitelná v dohodnutých e-mailových klientech na mobilu i desktopu.

Tyto podmínky jsou předáním požadovaného výsledku. Výběr technologií, interních kontrol a způsobu zajištění doručení patří vývoji.
