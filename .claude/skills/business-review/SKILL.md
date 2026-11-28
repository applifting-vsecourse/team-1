---
name: business-review
description: Hromadný business review Togeny (team-1) pro product managera. Vezme všechny tickety ve sloupci „In Business Review“, připraví klikací scénáře s rychlým seedem a ovládacím panelem, kde se rovnou zapisují verdikty a poznámky (jeden příkaz); po „hotovo“ tickety uzavře a založí navazující. Použij při slovech „business review“, „otestovat hromadně tickety“, „projít sloupec In Business Review“, „připrav mi review“, nebo když uživatel po takovém review napíše „hotovo“.
---

# Hromadný business review

Cíl: PM otestuje všechny tickety naráz s minimem tření. Jeden příkaz, data se sypou sama, mezi scénáři se přepíná v panelu a tam se píšou i verdikty a poznámky (`<běh>/notes.json`). Artefakt se nedělá (rozhodnutí product managera 28. 11. 2026). Odpovídej česky.

## Engine (neměň, jen používej)

`node .claude/skills/business-review/engine/br.mjs`, spouští se z kořene checkoutu team-1.

| Volání                                                      | Co dělá                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `new`                                                       | založí `.local/manual-flows/br-<datum>/review.json` z boardu a vypíše PR, která nejsou v checkoutu |
| bez příkazu                                                 | spustí poslední review (`--run <složka>` pro jiné)                                                 |
| `--list`, `--from 3.2`, `--only 3`, `--fresh`, `--slow 500` | přehled (spadne, když některý ticket nemá blok), start od bloku, výběr, nová data, tempo           |
| `--auto`                                                    | headless průchod všech zobrazení, snímky v `out/shots`                                             |

Pro každé review píšeš jen `review.json` a `scenarios/*.mjs`. Nic z enginu nekopíruj do složky běhu. Když scénářům chybí seed helper nebo ovládání, doplň ho do enginu (`engine/lib/seed.mjs`, `harness.mjs`), ať ho má i příští review; chování existujících funkcí neměň. Po zásahu do panelu pusť `node .claude/skills/business-review/engine/selfcheck.mjs`.

Vždy platí: jen lokální aplikace, vše v ignorované složce, žádné změny sledovaných souborů, žádné mazání dat, žádné automatické verdikty.

## 1. Příprava

1. Checkout: hlavní, na aktuálním `main` (`git fetch`; `pull --ff-only` jen při čistém stromu, jinak se zeptej). Aplikace už má běžet; nespouštěj druhou.
2. `br.mjs new`. Podívej se na `notes.json` z minulého review: netestované a vrácené tickety zmiň v `note`.
3. Každý ticket přečti (`gh issue view <n> --comments`). Do `review.json` → `note` napiš jen to, co mění posouzení: není v main, přepsal ho pozdější redesign, neodškrtnutá kritéria. `new` vidí jen PR propojená s ticketem, proto projdi i `gh pr list --state open` a hledej tickety, které otevřené PR jen zmiňuje.
4. Tickety bez čeho klikat (testovací, výzkumné) dej do `extra`: `[{ "title", "stories": [n], "look": [] }]`.
5. Scénáře podle vzoru `engine/example/01-vstup.mjs`:
   - 3–6 scénářů seskupených podle role a dat, ne podle čísel ticketů. Scénáře jsou nezávislé (seedují se souběžně).
   - Blok = jedna obrazovka nebo flow, i pro víc ticketů. `look` jsou krátké řádky začínající `#číslo`: co udělat a co má být vidět podle zadání, ne podle kódu.
   - **Všechno opakované klikání patří do `seed`** (přes API): přihlášky, platby, pokoje, stavy. Uživatel kliká jen to, co posuzuje. Víc kroků před posouzenou akcí udělá `h.act` v zobrazení.
   - Zobrazení = stav na jedno kliknutí (role, adresa, otevřený dialog), včetně 360 px.
   - Akce, která data spotřebuje (storno, spárování, schválení), dostane v seedu náhradní záznamy, ať není potřeba „Čerstvá data“.
   - Data se zakládají přes API; `db()` jen pro stavy, které přes API nevzniknou, a jen nad vlastními záznamy. Pozor na limity: přihlášení 5/min, veřejné přihlášky 20/min (`applyFillers`).
6. Ověření: `br.mjs --auto`, oprav selhání, prohlédni snímky (opravdu ukazují popsaný stav?). `--auto` zakládá data v lokální DB. Když ho oprávnění zamítne, neobcházej to; v předání napiš, že scénáře nejsou ověřené, a nabídni, ať ho uživatel pustí (`! node .claude/skills/business-review/engine/br.mjs --auto`).
7. `br.mjs --list` musí projít.

Předání: jeden příkaz a jen to, co vyžaduje pozornost.

## 2. Po „hotovo“

1. Přečti `notes.json` v poslední složce `.local/manual-flows/br-*`: `blocks.<id>.note`, `blocks.<id>.stories.<n>.verdict` (`done` / `back` / prázdné) a `tags` (`bug`, `change`, `idea`), obecné poznámky v `general`. Ticket, který v souboru chybí, nemá verdikt. Poznámka na blok s více tickety patří k tomu, který jmenuje nebo kterého se zjevně týká.
2. Ticket ve více blocích: stačí jedno `back` a je vrácený.

| Verdikt | Co udělat                                                                |
| ------- | ------------------------------------------------------------------------ |
| `done`  | zavřít ticket, na boardu Done; nálezy z poznámky jako navazující tickety |
| `back`  | zůstává v Business Review; nálezy jako navazující tickety s odkazem      |
| prázdný | neměnit, nahlásit jako netestované                                       |

3. Než založíš ticket, hledej otevřený duplikát (tehdy jen komentář). Jeden problém = jeden ticket, s kontextem, akceptačními kritérii a citací poznámky. Milník, štítky, projekt a Sprint podle `CLAUDE.md` („Issues“). Nápad bez jasného zadání nech jako `idea`, požadavky nedomýšlej.
4. Nejasné poznámky (nelze určit ticket, verdikt si odporuje s textem) polož naráz přes AskUserQuestion s navrženým řešením. Zbytek proveď bez ptaní: „hotovo“ je souhlas.
5. Board: `gh project item-edit --id <itemId z review.json> --project-id "$(gh project view 12 --owner applifting-vsecourse --format json | jq -r .id)" --field-id PVTSSF_lADOE11UWM4BmUMgzhk9udk --single-select-option-id 98236657`.
6. Report krátce: počet Done, vrácené a netestované, nové tickety, co čeká na uživatele.
