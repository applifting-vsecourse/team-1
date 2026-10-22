# YAML → Mermaid

```
pip install pyyaml
python generate.py              # všechna *.yaml v této složce
python generate.py zpracovani-prihlasky/zpracovani-prihlasky.yaml
```

Pro každé `X.yaml` vznikne `X.mmd` (čistý Mermaid) a `X.md` (stejný kód v ` ```mermaid ` bloku). Generované soubory needituj, měň jen YAML.

## Formát (procesní diagram)

```yaml
title: Název
direction: TD # TD (výchozí) | LR
nodes:
  - { id: a, type: event, label: Text, role: volitelné, unsure: true }
flows:
  - { from: a, to: b, label: volitelné, dashed: true }
groups: # volitelné, vykreslí subgraph (např. business funkce)
  - { id: f1, label: Název funkce, members: [a, b] }
```

Typy uzlů:

| type        | tvar              | použití                                                                                                                       |
| ----------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| event       | kruh              | ad-hoc událost                                                                                                                |
| timed       | kruh, tečkovaný   | časovaná událost                                                                                                              |
| task / step | zaoblený obdélník | úloha / procesní krok (volitelně `role`)                                                                                      |
| process     | `[[ ]]`           | business proces (mapa)                                                                                                        |
| state       | stadium           | stav objektu / procesu                                                                                                        |
| end         | stadium, červený  | koncový stav                                                                                                                  |
| gateway     | kosočtverec       | `kind`: `x` = **XOR** (oranžová, právě jedna větev), `+` = **AND** (modrá, všechny větve), `o` = **OR** (zelená, aspoň jedna) |
| note        | obdélník, žlutý   | poznámka                                                                                                                      |

`unsure: true` zvýrazní nejistou část náčrtku.

## Diagram tříd a životní cyklus

Klíč `diagram: class` nebo `diagram: lifecycle` (výchozí je `process`). Podrobné schéma je v `MMABP_LITE.md`, sekce 7.

```yaml
diagram: class
classes: [{ id: order, label: Customer Order, attrs: ["+date"], ops: ["+register()"] }]
relations: [{ from: order, to: item, type: composition, from_card: "1", to_card: "1..*" }]
```

Typy vztahů: `assoc`, `directed`, `aggregation`, `composition`, `generalization`, `dependency`.

```yaml
diagram: lifecycle
states: [{ id: placed, label: Placed }]
transitions: [{ from: start, to: placed, reason: Order placed, op: register() }]
```

Volitelný klíč `rank_spacing` (výchozí 90) určuje svislé odstupy mezi stavy: větší číslo = vyšší, řidší diagram. Dlouhé popisky přechodů se zalamují.

`start` / `end` jsou rezervovaná id. Generátor u životního cyklu varuje (na stderr) před přechodem bez důvodu a nekoncovým stavem s méně než dvěma odchozími přechody.

## Synchronizace s událostí

Proces, který čeká na událost, generátor kreslí přes AND bránu, aby bylo vidět, že se v ní zastaví, dokud nedorazí tok od úlohy i od události. Zdroj je `task`, `step` nebo `state`, událost `event` nebo `timed`. V YAML píšeš jen toky zdroj → událost → další krok.

| V YAML                                                                                            | Co se nakreslí                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `úloha → událost → další`                                                                         | `úloha → AND ← událost`, `AND → další`                                                                                                      |
| `zdroj → událost 1`, `zdroj → událost 2` (aspoň dvě, nastane jedna z nich), `událost n → další n` | `zdroj → AND ← XOR ← události`, `AND → XOR → další n` (každá výstupní větev je popsaná názvem své události, pokud tok nemá vlastní `label`) |

Brány se nedoplní, když do události žádný takový tok nevede (spouštěcí událost) nebo když máš u události `sync: false`. Explicitní brány zůstávají, jak je zapíšeš.

## Poznámky

- ID uzlů v YAML může být cokoli, generátor je převede na bezpečná ID.
- Generátor ověřuje jen odkazy na existující uzly a známé typy, obsah modelu nekontroluje.
- Výstup cílí na Mermaid 10.3.0 (popisky v uvozovkách, žádné `@{ shape }`).
