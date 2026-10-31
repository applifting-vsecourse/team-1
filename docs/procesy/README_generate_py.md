# YAML → Mermaid

```
pip install pyyaml
python generate.py              # všechna *.yaml v této složce
python generate.py zpracovani-prihlasky/rucni-vyhodnocovani/zpracovani-prihlasky.yaml
```

Pro každé `X.yaml` vznikne `X.mmd` (čistý Mermaid) a `X.md` (stejný kód v ` ```mermaid ` bloku). Generované soubory needituj, měň jen YAML.

Schéma YAML (procesní diagram, diagram tříd, životní cyklus), pravidla doplňování bran a nastavení jsou na jednom místě: [`MMABP_LITE.md`, kapitola 7](MMABP_LITE.md). Co znamenají tvary v diagramu, je v [`LEGENDA.md`](LEGENDA.md).

Syntaxi vygenerovaných `.mmd` ověří parser Mermaid 10.3.0: `./check_mermaid.sh zpracovani-prihlasky/*/*.mmd` (potřebuje Node a npm, závislosti si při prvním spuštění nainstaluje do `~/.cache`, repo se nemění). Generátor sám syntaxi nekontroluje.

## Poznámky

- ID uzlů v YAML může být cokoli, generátor je převede na bezpečná ID.
- Generátor ověřuje jen odkazy na existující uzly a známé typy, obsah modelu nekontroluje.
- Výstup cílí na Mermaid 10.3.0 (popisky v uvozovkách, žádné `@{ shape }`).
