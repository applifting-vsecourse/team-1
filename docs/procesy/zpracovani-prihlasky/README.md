# Zpracování přihlášky v termínu

Procesní a stavový diagram přihlášky v termínu ve dvou režimech vyhodnocování. Režim volí organizátor v nastavení akce.

| Režim                                                                            | Procesní diagram                                                             | Stavový diagram                                                                                          |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Ruční](rucni-vyhodnocovani/) (organizátor vyhodnocuje)                          | [zpracovani-prihlasky.md](rucni-vyhodnocovani/zpracovani-prihlasky.md)       | [prihlaska-v-terminu-zivotni-cyklus.md](rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.md)       |
| [Automatické](automaticke-vyhodnocovani/) (systém podle pohlaví a volných lůžek) | [zpracovani-prihlasky.md](automaticke-vyhodnocovani/zpracovani-prihlasky.md) | [prihlaska-v-terminu-zivotni-cyklus.md](automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.md) |

Rozdíl je jen na začátku a u náhradníků. Platby, výzva k zaplacení, zrušení a archivace jsou v obou režimech stejné, proto je v obou složkách kopie. Změnu té společné části je potřeba udělat na obou místech.

|                      | Ruční                                                                                                                                             | Automatické                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Nastavení akce       | režim vyhodnocování a pokoje (počet, lůžka na pokoj, dámský / pánský); odkaz na přihlášku se vygeneruje sám, jakmile akce splní všechny požadavky | stejné                                                                                                       |
| Po zaregistrování    | stav K vyhodnocení, pořadník, čeká se na organizátora                                                                                             | systém hned vyhodnotí podle skupiny lůžek a volných lůžek                                                    |
| Výsledek vyhodnocení | potvrdí, náhradník, zamítne                                                                                                                       | potvrzená s dluhem, nebo náhradník (zamítnutí při vyhodnocení není)                                          |
| Uvolní se místo      | náhradníka potvrdí ručně organizátor; půlnoc Europe/Prague prvního dne termínu se jeho přihláška zruší                                            | náhradníka potvrdí systém v pořadí přijetí; půlnoc Europe/Prague prvního dne termínu se jeho přihláška zruší |

Pravidla společná oběma režimům:

- Pořadník se vede po termínu a skupině lůžek: podle pohlaví, a když pokoj pohlaví nemá, je jedna společná fronta pro obě pohlaví ([D-063](../../rozhodnuti/README.md#d-063)).
- Pořadí v pořadníku je podle data přijetí přihlášky. Platí i pro přihlášku přesunutou z Potvrzené mezi náhradníky, která tak může skočit před dřívější náhradníky ([D-073](../../rozhodnuti/README.md#d-073)).
- Organizátor může přesunout Potvrzenou s dluhem mezi náhradníky a zrušit náhradníka kdykoli, i v automatickém režimu ([D-056](../../rozhodnuti/README.md#d-056), [D-057](../../rozhodnuti/README.md#d-057)). Potvrzenou a zaplacenou přihlášku mezi náhradníky přesunout nelze.
- Náhradník se sám zruší půlnoc českého času (Europe/Prague) prvního dne termínu ([D-064](../../rozhodnuti/README.md#d-064)).
- Zrušení termínu zruší přihlášky ve všech stavech kromě archivované, účastníci dostanou e-mail a zaplacené platby se vrací ([D-065](../../rozhodnuti/README.md#d-065), [D-076](../../rozhodnuti/README.md#d-076)); proces je v [zruseni-terminu.md](zruseni-terminu.md), přechody do Zrušené jsou i ve stavových diagramech.

E-maily přihlašovateli v jednotlivých přechodech: [EMAILY.md](EMAILY.md).

Soubory `.mmd` a `.md` jsou generované z `.yaml` ([návod](../README_generate_py.md)), needitují se.
