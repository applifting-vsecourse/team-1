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
| `rozhodnuti_ref` | od stavu `rozhodnuto` | ID rozhodnutí v [registru rozhodnutí](../rozhodnuti/SCHEMA.md); rozhodnutí samotné a jeho dopad na dokumentaci jsou tam |
| `navazne_tickety` | ne | seznam `{label, url}`; `url: null` = ticket je třeba založit (jde do přehledu „Tickety k založení“) |
| `uzavreno_duvod` | u `uzavreno` bez `rozhodnuti_ref` | proč je otázka zbytečná nebo už rozhodnutá |

Role a jména jsou v bloku `role:` na začátku `otazky.yaml`, jinde se jména neuvádějí.

Pravidla validace: unikátní ID, známý stav, priorita a role, `duplikat_z` ukazuje na existující ID, `rozhodnuto` a `zapsano` mají platné `rozhodnuti_ref`, `zapsano` vyžaduje, aby měl odkazované rozhodnutí celou `dokumentaci` ve stavu `hotovo` s `commit`.
