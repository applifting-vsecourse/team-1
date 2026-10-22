# Zpracování přihlášky v termínu

Procesní a stavový diagram přihlášky v termínu ve dvou režimech vyhodnocování. Režim volí organizátor v nastavení akce.

| Režim                                                                            | Procesní diagram                                                             | Stavový diagram                                                                                          |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Ruční](rucni-vyhodnocovani/) (organizátor vyhodnocuje)                          | [zpracovani-prihlasky.md](rucni-vyhodnocovani/zpracovani-prihlasky.md)       | [prihlaska-v-terminu-zivotni-cyklus.md](rucni-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.md)       |
| [Automatické](automaticke-vyhodnocovani/) (systém podle pohlaví a volných lůžek) | [zpracovani-prihlasky.md](automaticke-vyhodnocovani/zpracovani-prihlasky.md) | [prihlaska-v-terminu-zivotni-cyklus.md](automaticke-vyhodnocovani/prihlaska-v-terminu-zivotni-cyklus.md) |

Rozdíl je jen na začátku a u náhradníků. Platby, výzva k zaplacení, zrušení a archivace jsou v obou režimech stejné, proto je v obou složkách kopie. Změnu té společné části je potřeba udělat na obou místech.

|                      | Ruční                                                 | Automatické                                                           |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| Nastavení akce       | režim vyhodnocování                                   | režim vyhodnocování a pokoje (počet, lůžka na pokoj, dámský / pánský) |
| Po zaregistrování    | stav K vyhodnocení, pořadník, čeká se na organizátora | systém hned vyhodnotí podle pohlaví a volných lůžek                   |
| Výsledek vyhodnocení | potvrdí, náhradník, zamítne                           | potvrzená s dluhem, nebo náhradník (zamítnutí při vyhodnocení není)   |
| Uvolní se místo      | náhradníka potvrdí ručně organizátor                  | náhradníka potvrdí systém v pořadí přijetí                            |

Soubory `.mmd` a `.md` jsou generované z `.yaml` ([návod](../README_generate_py.md)), needitují se.
