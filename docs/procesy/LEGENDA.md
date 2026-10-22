# Legenda diagramů

Co znamenají tvary a čáry v Mermaid diagramech generovaných z YAML (`generate.py`). Tři druhy diagramů: procesní, tříd, životní cyklus. Metodika je v [`MMABP_LITE.md`](MMABP_LITE.md).

## 1. Procesní diagram (`diagram: process`)

Procesní mapa (globální) i detailní proces. Čte se po šipkách od události ke stavům.

```mermaid
flowchart LR
  classDef ev fill:#ffffff,stroke:#333,stroke-width:1px
  classDef timed fill:#ffffff,stroke:#333,stroke-width:1px,stroke-dasharray:2 2
  classDef task fill:#ffffff,stroke:#333
  classDef proc fill:#e6fffa,stroke:#2c7a7b
  classDef st fill:#eef6ff,stroke:#2b6cb0
  classDef endst fill:#fde8e8,stroke:#c53030
  classDef gw_xor fill:#fff1d6,stroke:#c05621,stroke-width:2px
  classDef gw_and fill:#e3ecff,stroke:#2b4acb,stroke-width:2px
  classDef gw_or fill:#e2f7e8,stroke:#2f855a,stroke-width:2px
  classDef note fill:#fffbe6,stroke:#d69e2e,stroke-dasharray:3 3
  classDef unsure stroke-dasharray:4 3,stroke-width:2px,stroke:#d69e2e

  ev(("Ad-hoc událost"))
  timed(("Časovaná událost"))
  task("Úloha / procesní krok<br/>role: kdo provádí")
  proc[["Business proces"]]
  st(["Stav objektu nebo procesu"])
  endst(["Koncový stav"])
  gwx{"XOR"}
  gwa{"AND"}
  gwo{"OR"}
  note["Poznámka"]
  unsure("Nejistá část")

  class ev ev
  class timed timed
  class task task
  class proc proc
  class st st
  class endst endst
  class gwx gw_xor
  class gwa gw_and
  class gwo gw_or
  class note note
  class unsure task,unsure
```

| Tvar a barva                      | Typ v YAML           | Význam                                                                                                                                                                                                                             |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kruh                              | `event`              | ad-hoc událost: příchozí informace, která spouští proces (např. „Customer Order placed“)                                                                                                                                           |
| kruh, tečkovaný okraj             | `timed`              | časovaná událost: časový okamžik nebo uplynutí lhůty                                                                                                                                                                               |
| zaoblený obdélník                 | `task`, `step`       | úloha (mění stav jednoho objektu) nebo procesní krok; pod názvem `role:` kdo ji provádí                                                                                                                                            |
| obdélník s dvojitými boky, zelený | `process`            | business proces v procesní mapě                                                                                                                                                                                                    |
| stadion, modrý                    | `state`              | stav objektu nebo procesu, kde se čeká na událost; název „Třída: stav“                                                                                                                                                             |
| stadion, červený                  | `end`                | koncový, cílový stav                                                                                                                                                                                                               |
| kosočtverec **XOR**, oranžový     | `gateway`, `kind: x` | exkluzivní brána: právě jedna větev (rozhodnutí)                                                                                                                                                                                   |
| kosočtverec **AND**, modrý        | `gateway`, `kind: +` | paralelní brána: všechny větve naráz (rozdělení nebo synchronizace); sama není stav procesu. Před událostí, na kterou proces čeká, ji generátor doplní sám: úloha → AND ← událost, proces dál nepokračuje, dokud nedorazí oba toky |
| kosočtverec **OR**, zelený        | `gateway`, `kind: o` | inkluzivní brána: aspoň jedna větev; používej výjimečně                                                                                                                                                                            |
| obdélník, žlutý, čárkovaný        | `note`               | poznámka                                                                                                                                                                                                                           |
| silný žlutý čárkovaný okraj       | `unsure: true`       | nejistá část náčrtku, k ověření                                                                                                                                                                                                    |

| Čára               | Význam                                                                        |
| ------------------ | ----------------------------------------------------------------------------- |
| plná šipka         | tok; `label` je popisek (např. podmínka větve nebo předávaná informace)       |
| čárkovaná šipka    | `dashed: true`: synchronizace nebo vazba mezi procesy a poznámkou, ne tok dat |
| rámeček s nadpisem | `groups`: seskupení, typicky jedna business funkce                            |

## 2. Diagram tříd (`diagram: class`)

Statická struktura: jaké objekty business zná a jak spolu souvisí.

```mermaid
classDiagram
  class Celek["Celek (třída)"] {
    +povinnyAtribut
    +nepovinny [0..1]
    +operace()
  }
  class Cast["Část"]
  class Agreg["Agregovaná část"]
  class Obecna["Obecnější třída"]
  class Spec["Specializace"]
  class Jina["Jiná třída"]
  class AsocTrida["Asociační třída"]
  Celek "1" *-- "1..*" Cast : kompozice
  Celek "1" o-- "0..*" Agreg : agregace
  Obecna <|-- Spec
  Celek "1" --> "0..1" Jina : orientovaná
  Celek "1" -- "0..*" Obecna : prostá
  Celek ..> Jina : závislost
  Celek .. AsocTrida
```

| Prvek                                       | Typ v YAML                      | Význam                                                                           |
| ------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| obdélník se 3 oddíly                        | `classes`                       | třída: název, atributy, operace                                                  |
| atribut bez mohutnosti                      | `attrs`                         | povinný atribut                                                                  |
| `[0..1]` u atributu                         | `attrs`                         | nepovinný atribut                                                                |
| `+operace()`                                | `ops`                           | operace třídy (strukturální: New, add, set, remove)                              |
| `--`                                        | `assoc`                         | prostá asociace                                                                  |
| `-->`                                       | `directed`                      | jednostranná asociace (druhá strana se řeší životním cyklem)                     |
| plný kosočtverec `*--`                      | `composition`                   | kompozice: část existuje jen v jednom celku a bez něj ne; kosočtverec je u celku |
| prázdný kosočtverec `o--`                   | `aggregation`                   | agregace: část může existovat samostatně a být ve více celcích                   |
| prázdná trojúhelníková šipka `<\|--`        | `generalization`                | specializace míří na obecnější třídu                                             |
| `..>`                                       | `dependency`                    | závislost                                                                        |
| čárkovaná čára ke třídě                     | `assoc_class`                   | asociační třída: asociace s vlastními atributy                                   |
| čísla u konců (`1`, `0..1`, `1..*`, `0..*`) | `from_card`, `to_card`          | mohutnost; `1` povinná, `0..` nepovinná, `*` mnoho                               |
| text na čáře                                | `label`, `from_role`, `to_role` | název vazby nebo role                                                            |

## 3. Životní cyklus objektu (`diagram: lifecycle`)

Obecná pravidla jedné třídy: v jakých stavech může být a co ho přepíná. Jeden diagram = jedna třída, žádné brány.

```mermaid
stateDiagram-v2
  state "Stav objektu" as a
  state "Další stav" as b
  [*] --> a : událost nebo podmínka / operace()
  a --> b : důvod přechodu / operace()
  a --> a : přechod do téhož stavu
  b --> [*] : konec života
```

| Prvek                                | Klíč v YAML   | Význam                                                                                                 |
| ------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------ |
| černá tečka `[*]` na začátku         | `from: start` | zrození objektu; nemá název, přechod nese důvod vzniku                                                 |
| zaoblený obdélník                    | `states`      | významný stav objektu (dokonaný i průběhový, např. „vyřizovaná“)                                       |
| černá tečka v kruhu `[*]` na konci   | `to: end`     | konec života objektu (koncový stav)                                                                    |
| šipka s popiskem `důvod / operace()` | `transitions` | přechod: `reason` je událost nebo podmínka (povinné), `op` operace existující ve třídě v diagramu tříd |

Z každého nekoncového stavu vedou aspoň dva přechody a aspoň jeden určitě nastane (např. časově), jinak hrozí deadlock. Generátor na to upozorní varováním.
