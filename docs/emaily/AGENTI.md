# E-maily: pokyny pro agenty a vývojáře

Čti, kdykoli práce sahá na e-maily: nová nebo změněná šablona (`apps/backend/src/core/email/`), odesílání e-mailu, spouštěč, příjemce, jazyk, text, vzhled nebo patička. Ostatní dokumenty v této složce jsou podklady, tento říká, co s nimi dělat.

## Zdroje pravdy (shora dolů; výše vyhrává)

1. Procesní a stavové modely ([zpracovani-prihlasky](../procesy/zpracovani-prihlasky/README.md)), potom registr [rozhodnutí](../rozhodnuti/README.md).
2. [KATALOG.md](KATALOG.md): jediný přehled e-mailů. Která zpráva, kdy, komu, v jakém rozsahu. Tabulka „Figma a místo v kódu“ na konci říká, kde je rámec ve Figmě, šablona i odesílání.
3. [TEXTY.md](TEXTY.md): schválené znění CS a EN, předměty, patičky, kontakty.
4. Figma (Design system, stránka „HF / 09 E-maily · nový design“), odkazy v katalogu.
5. Kód. Stav realizace a čekající spouštěče jsou v [REALIZACE.md](REALIZACE.md). Kód nikdy nepřepisuje business pravidlo.

## Co dělat podle situace

| Situace                                  | Postup                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Změna textu existující zprávy            | Nejdřív musí být změněný a schválený [TEXTY.md](TEXTY.md) (schvaluje PM). Pak šablona v CS i EN naráz a test. Text si nevymýšlej.                                                                                                                                                               |
| Nová zpráva nebo nová business událost   | **Nepiš kód.** Zpráva není v katalogu, tedy není schválená. Postup změny katalogu je v [SYSTEM.md](SYSTEM.md); v PR vypiš, co chybí (událost, příjemce, rozsah, text, rámec ve Figmě) a označ `@Aadikk` (viz CLAUDE.md, „Business rules“). Katalog ani texty neměň, pokud o to nikdo nepožádal. |
| Napojení spouštěče na existující šablonu | Najdi ji v tabulce „Figma a místo v kódu“ a v REALIZACE.md, „Co musí počkat“: tam je napsáno, kudy se odesílá a jaké podmínky platí. Použij existující cestu (`sendApplicationChange` přes `TermStatusService.applyChange` apod.), novou nezakládej.                                            |
| Změna vzhledu                            | Jen ve společném základu `email-kit.tsx` a podle rámce ve Figmě. Šablonu nestyluj po svém. Hlavní komponenta nese komentář `Figma:` s názvem rámce a URL.                                                                                                                                       |
| Situace, kdy e-mail neodchází            | Viz konec [KATALOG.md](KATALOG.md), „Kdy samostatný e-mail neodchází“. Neodesílej ho „pro jistotu“.                                                                                                                                                                                             |

## Pravidla, která se porušují nejsnáze

- **Jedna zpráva za přihlášku**, ne za termín a ne za účastníka. Potvrzení přijetí (E01) je jedna za celé odeslání formuláře.
- **Platební údaje** jen tam, kde to katalog dovoluje (přijetí v automatickém režimu u potvrzených termínů, potvrzení účasti, výzva, oprava platby). Ve zrušených přihláškách nejsou. Částky a variabilní symboly přebírej z platební domény, nepočítej je v šabloně.
- **Pořadí náhradníků** se nikdy nesděluje. Neslibuj lhůty, sankce ani vrácení peněz, které neschválil PM.
- **Obě řeči**: copy je v šabloně pro `cs` i `en` a chybějící překlad je chyba typu. Česky vykání. Jazyk podle pravidel v KATALOG.md (D-078).
- **Pojmy** ze [SLOVNIKU](../SLOVNIK.md), jména se neskloňují (D-098), peníze a data přes `formatCzk` / `formatDate`.
- **Kontakty v patičce**: přihlášky, účast a platby organizátor, účet a přihlášení podpora Togeny.
- **Obecné ověření e-mailové adresy** se neposílá (D-105).
- **Nikdy neposílej skutečnou poštu** z vývoje: spouštěj bez `RESEND_API_KEY`.

## Po změně

- Aktualizuj tabulku „Figma a místo v kódu“ v [KATALOG.md](KATALOG.md) (nová šablona, nový odesílatel, odesílání, které už funguje) a stav v [REALIZACE.md](REALIZACE.md). Je to odkazová tabulka; pravidla v katalogu tím neměníš.
- Ověř: `pnpm backend test` (šablony, mailer, podklady) a náhled `pnpm backend email:dev`.
- Business mezeru nebo rozpor zdrojů dej do PR pod „Nejasnosti k byznys pravidlům“ a neřeš odhadem.
