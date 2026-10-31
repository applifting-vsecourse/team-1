# Schéma `rozhodnuti.yaml`

Jeden záznam v `rozhodnuti:` = jedno rozhodnutí. `python generate.py` ověří pravidla níže a přegeneruje `README.md`; `--check` jen ověří (hodí se do CI). Registr čte i `../otevrene-otazky/otazky.yaml` (role a vazby na otázky).

| Pole                        | Povinné           | Význam                                                                                                   |
| --------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `id`                        | ano               | `D-<nnn>`, sekvenční podle data vzniku, nikdy se nepřepoužije                                            |
| `nazev`, `text`             | ano               | krátký název a plné znění                                                                                |
| `typ`                       | ano               | `byznys`, `produkt`, `design`, `technicke`, `proces`                                                     |
| `oblast`                    | ano               | epic z registru otázek, nebo `design`, `tým a proces`                                                    |
| `datum`                     | ano               | `RRRR-MM-DD`; `null` jen u rozhodnutí z boardu (zdroj začíná „board“)                                    |
| `rozhodl`                   | od stavu `platne` | seznam rolí z registru otázek (`pm`, `tech-lead`, `design`, `qa`, `po`) nebo `tym`                       |
| `navrhl`                    | u `navrh`         | role, která rozhodnutí navrhla                                                                           |
| `zdroj`                     | ano               | seznam `{popis, url\|soubor}`; `soubor` musí existovat v repu                                            |
| `us`                        | ne                | dotčené story `{label, url}`                                                                             |
| `stav`                      | ano               | `navrh` (čeká na PM) → `platne` → `nahrazene` \| `zrusene`                                               |
| `nahrazuje` / `nahrazeno_v` | u řetězců         | úplná výměna; pár musí být konzistentní, nástupce nesmí být starší                                       |
| `meni` / `zmeneno_v`        | u částečných změn | původní rozhodnutí zůstává `platne`, část se změnila (např. dashboard 25. 10. → 28. 10.)                 |
| `duvod`                     | u `zrusene`       | proč se zrušilo                                                                                          |
| `z_otazek`                  | ne                | ID otázek z registru otázek; opak je `rozhodnuti_ref` u otázky                                           |
| `dokumentace`               | ne                | co se kvůli rozhodnutí zapisuje: `{soubor, popis, stav: ceka\|hotovo, commit}`; `hotovo` vyžaduje commit |
| `poznamka`                  | ne                | např. kolize s jiným rozhodnutím                                                                         |

Pohledy v `README.md`: návrhy čekající na PM, nezapsaný dopad na dokumentaci, změny dřívějších rozhodnutí, platná rozhodnutí podle oblasti, nahrazená a zrušená, detail.

Typy `technicke` a `proces` zůstávají v registru, ale kontrola dopadu byznys rozhodnutí se zaměřuje hlavně na `byznys` a `produkt`.
