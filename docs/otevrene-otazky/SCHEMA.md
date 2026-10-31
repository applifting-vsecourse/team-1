# Schéma `otazky.yaml`

Jeden záznam v `otazky:` = jedna otázka. `python generate.py` ověří pravidla níže a přegeneruje `README.md`; `--check` jen ověří (hodí se do CI).

| Pole | Povinné | Význam |
| --- | --- | --- |
| `id` | ano | `Q-<EPIC>-<nn>`, nikdy se nepřepoužije, ani po uzavření |
| `otazka` | ano | znění otázky |
| `epic`, `us` | ano | epic z labelů issue; `us` je seznam `{label, url}` |
| `stav` | ano | `otevreno` → `rozhodnuto` → `zapsano` → `uzavreno` |
| `priorita`, `priorita_duvod` | u neuzavřených | `P0` blokuje merge nebo demo, `P1` sprint a rozdělaná práce, `P2` brzy, `P3` později |
| `ceka_na` | ano | role, která má teď tah: `pm`, `tech-lead`, `design`, `qa`, `po` (klient = `po`) |
| `zdroje` | u neuzavřených | seznam `{popis, url, citace}` |
| `duplikat_z` | ne | ID hlavní otázky |
| `rozhodnuti` | od stavu `rozhodnuto` | `{text, rozhodl, datum, zdroj}`; plochý blok, později se vytáhne do samostatného registru rozhodnutí |
| `dokumentace` | ne | co se kvůli rozhodnutí zapisuje: `{soubor, popis, stav: ceka\|hotovo, commit}` |
| `navazne_tickety` | ne | seznam `{label, url}`; `url: null` = ticket je třeba založit (jde do přehledu „Tickety k založení“) |
| `uzavreno_duvod` | u `uzavreno` bez `rozhodnuti` | proč je otázka zbytečná nebo už rozhodnutá |

Role a jména jsou v bloku `role:` na začátku `otazky.yaml`, jinde se jména neuvádějí.

Pravidla validace: unikátní ID, známý stav, priorita a role, `duplikat_z` ukazuje na existující ID, `rozhodnuto` a `zapsano` mají `rozhodnuti.text`, `rozhodl` a `datum`, `zapsano` má celou `dokumentaci` ve stavu `hotovo` s `commit`.
