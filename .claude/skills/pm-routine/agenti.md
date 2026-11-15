# PM rutina přes subagenty (týdenní a hloubkový režim)

Postup pro režim, kdy je toho na jednoho agenta moc: týdenní kontrola, `--full` nebo „dluh analytiky“ (všechno, co se kdy bude muset rozhodnout nebo zapsat). Denní režim tohle nepotřebuje, jede podle `SKILL.md`, kroky 1–8.

Orchestrátor (ten, kdo skill spustil) sám nic nesbírá ani nezapisuje ve velkém: připraví kontext, rozdá práci, čte jen konsolidovaný výstup, ukazuje PM brány schválení a hlídá, že každá delegace vrátila, co měla. `$OUT` = složka `pm-rutina/` ve scratchpadu relace; každý agent píše jen do svého souboru v ní.

## Modely

| Práce                                                                                                                             | Model                                 | Proč                                     |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------- |
| Orchestrace, konsolidace, plán zápisu (`ZAPIS-PLAN.md`)                                                                           | Opus (`claude-opus-5-5`, effort high) | slučování duplicit a rozpory mezi nálezy |
| Sběr (fáze 1), patche dokumentů, texty komentářů, návrhy user stories, diagramy přes `model-update`, kontrola diagramů proti kódu | Sonnet (`claude-sonnet-5-5`)          | úsudek nad kódem a texty                 |
| Mechanické zápisy z doslovného zadání: změny stavů v YAML, publikace schválených textů, pole na boardu, úklid registru            | Haiku (`claude-haiku-5-5`)            | nic nevymýšlí, jen provede a ověří       |
| Doslovné patche, HTML report                                                                                                      | skript (`tools/`)                     | deterministické, bez tokenů              |

Delegace přes `delegate_task` (jiný model než orchestrátor), na výsledek se čeká notifikací, žádné pollování. Haiku dostane práci jen tehdy, když je vstup doslovný (přesný text, přesná ID, přesný cíl) a krok má ověření; jakmile je třeba něco posoudit, patří to Sonnetu.

## Šablona briefu

Každá delegace obsahuje v tomto pořadí:

1. „Nejdřív si přečti a dodržuj `$OUT/PRAVIDLA.md` a `$OUT/00-kontext.md`.“ (sběr a konsolidace); u zápisů místo toho repo, větev a co přesně smí měnit.
2. Kód agenta a výstupní soubor (`$OUT/<kód>.md`).
3. Rozsah: konkrétní soubory, ID, čísla PR a issues. Žádné „projdi vše“ bez seznamu.
4. Zákazy: nepřepínat větev, žádné worktrees, žádné `pnpm dev` ani testy aplikace, na GitHub nic (pokud to není úkol), neměnit nic mimo uvedené soubory, `git diff --stat` musí ukázat jen tyto soubory.
5. Ověření: co agent po zápisu znovu načte (`generate.py --check`, `check_mermaid.sh`, nový `gh … view`, GraphQL dotaz na pole boardu). Hlášení „hotovo“ bez ověření se nepočítá; `gh project item-edit` umí hlásit úspěch, i když se pole nezměnilo.
6. Formát odpovědi: max 5–6 řádků (počty, odchylky od plánu, SHA). U práce na PR poslední řádek `PR <URL>, head <SHA>, checks and reviews <stav>`.

## Fáze 0: Kontext (orchestrátor)

1. `git pull --ff-only` na `main`.
2. `$OUT/00-kontext.md`: SHA `main`, datum, řez (`poslední běh` z `docs/pm-rutina-stav.md`), otevřená PR, PR mergnutá od řezu (`gh pr list --state merged --search "merged:>=<řez>" --limit 200`), počty v obou registrech, seznam `dokumentace: ceka`.
3. `$OUT/PRAVIDLA.md` z [`pravidla-agentu.md`](pravidla-agentu.md).

## Fáze 1: Sběr (Sonnet, paralelně, read-only)

| Kód    | Rozsah                                                                                                                                                                                                                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1, A2 | otevřené otázky v `otazky.yaml` (A1 první polovina ID, A2 druhá): už zodpovězené (rozhodnutím, zápisem, kódem, PR), duplicity, zastaralé, špatné `ceka_na`; u otázek na PM doporučená odpověď. Logika `business-impact-check`, část A.                                                                                                                         |
| B      | „Nezapsaný dopad na dokumentaci“ (všechna `dokumentace: ceka`): ověřit proti kódu, napsat patche ve formátu níže.                                                                                                                                                                                                                                              |
| C      | `docs/zapisy/` od řezu (v hloubkovém režimu všechny): rozhodnutí, sliby, úkoly a otázky, které nejsou v registrech.                                                                                                                                                                                                                                            |
| D      | otevřená PR a mergnutá od řezu: „Nejasnosti k byznys pravidlům“, „Odchylky od Figmy“, „Mimo rozsah story“, komentáře s `@Aadikk`; ke každému dotazu hotová odpověď (nepublikovat). Otevřené tickety se starým stavem vůči registru (K6).                                                                                                                       |
| E1–E4  | rozhodnutí vývojářů a novinky v kódu (diffy PR × diagramy, registr, PROJEKT, SLOVNIK, KATALOG): E1 přihlášky a stavy, E2 platby, E3 akce, termíny, pokoje, program, nastavení, E4 e-maily, jazyky, účet, terminologie `cs` locale × slovník. Doporučení „schválit a zapsat“ / „vrátit vývojáři“ / „doptat se“. Orchestrátor rozdělí PR do domén podle titulků. |
| F      | `schema.prisma`, API, routy × `PROJEKT.md`; rozdíly jako K4 s patchem.                                                                                                                                                                                                                                                                                         |

V týdenním režimu stačí D, E (jen PR od řezu) a A1/A2; B, C a F jen při větším počtu `ceka` nebo nových zápisů. V hloubkovém režimu všechny.

## Fáze 2: Konsolidace (rozdělená, ať nenarazí na limit)

Jedna velká konsolidace na Opus narazila na limit API, proto se dělí hned od začátku:

1. **Opus:** `$OUT/REPORT.md` a `$OUT/DETAIL.md` (formát níže): sloučit duplicity, ověřit „neověřeno“, rozhodnout protichůdné nálezy, přidělit `N-nnn` a navrhnout nová `D-nnn` / `Q-…`.
2. Paralelně po bodu 1:
   - **Opus:** `$OUT/ZAPIS-PLAN.md`: mechanický plán zápisu do registrů (nová rozhodnutí jako `navrh`, změny existujících, nové otázky, změny stavů otázek jen s doloženou odpovědí, podmíněné kroky označené). Plán nanečisto ověřit oběma `generate.py` na kopii YAML ve scratchpadu.
   - **Sonnet:** `$OUT/PATCHE/<dokument>.patch.md` (PROJEKT, SLOVNIK, KATALOG, E2E…), `$OUT/PATCHE/DIAGRAMY.md` (slovní zadání změn diagramů pro `model-update`) a `$OUT/PATCHE/TICKETY.md` (tickety k založení nebo úpravě).
   - **Sonnet:** `$OUT/KOMENTARE.md`: odpovědi do PR a ticketů v 1. osobě PM, max 2–3 věty, tag jen tam, kde odpověď ukládá úkol, cíl (`Kam:` URL komentáře, na který se odpovídá, nebo „nový komentář“).
3. **Skript:** `python3 -I .claude/skills/pm-routine/tools/gen_html.py $OUT "<titulek>"` → `$OUT/REPORT.html`, publikovat jako Artifact (soukromý). Každý nález má přepínač Ano/Změnit a tlačítko „zkopírovat výjimky“.

**Brána 1 (PM):** do chatu max ~15 řádků (počty podle priority, top věci z „Opravdu potřebuje vaše rozhodnutí“, odkaz na report). PM defaultně schvaluje všechna doporučení a vrací jen výjimky.

### Formát `REPORT.md` (čte ho `gen_html.py`)

```
Datum: … · main `<sha>` · <n> surových nálezů → <n> nálezů
Priorita: P1 … · P2 … · P3 …
Kategorie: K1 … · K8 …

## Ke schválení jedním kliknutím
| ID | Co | Doporučení | Potvrdí | Ano/Změnit |
| N-001 · P1 · K2 | … | … | PM | Ano |

## Opravdu potřebuje vaše rozhodnutí
- **N-003** – max 2 věty s doporučením (max 10 položek)

## Pro klienta/PO
| ID | Věta k odeslání | Doporučená odpověď |

## Pro tech-leada / design
| ID | Co | Doporučení |

## Podle kategorie
| Kat. | Význam | P1 | P2 | P3 | ID |
```

`DETAIL.md`: sekce `### N-nnn` (důkazy, zdroje, alternativa) a na konci `## Vyřazeno` (surové nálezy, které nejsou nálezem, s důvodem).

### Formát patche (čte ho `tools/apply_patches.py`)

````
# Patche: docs/PROJEKT.md

### N-041 (D-052) – krátký popis
Místo: docs/PROJEKT.md, §5, ř. 71
Podmínka: <volitelné, např. „PR #464 je mergnutý“>
Nahradit:            (nebo „Vložit za řádek:“)
```text
<doslovný text, který v souboru stojí právě jednou>
```
Novým:
```text
<nový text>
```
````

Obsahuje-li kotva nebo nový text vlastní blok kódu (```), má vnější plot víc backticků (`text … `). Patch, jehož kotvu mění jiný patch, se sloučí do jednoho. Patche s `D-nnn` z téže dávky se aplikují až po zápisu registru.

## Fáze 3: Zápis návrhů (Sonnet, draft PR, bez čekání na PM)

Větev `docs/pm-rutina-<YYYY-MM-DD>` z `main` v hlavním checkoutu (žádný worktree). Provést `ZAPIS-PLAN.md` přesně, podmíněné kroky ne. Oba `generate.py` a `--check`. `git diff --stat` = oba YAML a oba README. Draft PR bez `Closes`, tělo: co je v PR, co v něm není (patche, komentáře), co čeká na PM. Po skončení `git switch main`. Business dokumenty, diagramy a GitHub se v této fázi nemění.

## Fáze 4: Po schválení PM

Pořadí kroků na větvi PR (každý krok = jeden commit, agenti běží za sebou, ne paralelně na téže větvi):

1. **Skript:** `python3 -I .claude/skills/pm-routine/tools/apply_patches.py $OUT/PATCHE . --skip "<podmínka, která ještě neplatí>"`, pak `pnpm prettier --write` na změněné dokumenty. Výjimky PM se do patchů promítnou ručně před spuštěním. `FAIL` řeší orchestrátor (kotvu mezitím změnil jiný commit), nikdy se patch nepřepisuje volně.
2. **Haiku:** návrhy → `platne` s `rozhodl: [pm]` (kromě výjimek); `dokumentace: ceka` → `hotovo` s commitem jen tam, kde grep potvrdí text v souboru; otázky na `rozhodnuto` / `zapsano` podle SCHEMA. Oba `generate.py --check`.
3. **Sonnet:** diagramy podle `PATCHE/DIAGRAMY.md` přes `model-update` (`.yaml` → `generate.py` → `check_mermaid.sh`), pak `business-impact-check`. Dokumentaci rozhodnutí s diagramem přepnout na `hotovo`.
4. **Sonnet, kontrola diagramů proti kódu:** každý změněný nebo přidaný přechod a uzel porovnat s doménovým kódem (`apps/backend/src/modules/*/domain/`) a se svým D-ID. Rozpor = zpět do kroku 3, nebo nález pro PM, pokud diagram říká rozhodnutí a kód se liší. Oba nálezy P1 z Codex review 14. 11. byly právě tohoto druhu (žádost o změnu × zdravotní požadavek; schválená žádost × okamžitá změna v ručním režimu).
5. **Orchestrátor:** `docs/pm-rutina-stav.md` (`poslední běh` = čas sběru, `režim`) do stejného PR. `pr-finish` pro docs-only PR (bez screenshotů a kritérií), `gh pr ready`, smyčka `node scripts/pr-review.mjs wait <pr>` na pozadí, každý nález i „Pozor“ ověřit a odpovědět komentářem `<!-- ai-review-answer: <sha> -->`. Velký PR vysvětlit v těle („Proč je PR větší“). Merge dělá PM.
6. **Podmíněné patche** (čekají na merge jiného PR nebo opravu v kódu) se nenechávají ve scratchpadu: jedno sledovací issue s labelem `chore` (založit, pokud chybí) a doslovnými patchi v těle, odkaz z těla PR.

### Brána 2: komentáře a tickety

PM dostane odkaz na `$OUT/KOMENTARE.md` a `$OUT/PATCHE/TICKETY.md` (nebo je přidá do reportu), schvaluje přesné texty. Po „souhlasím“:

- **Sonnet nebo Haiku** (podle toho, zda je text doslovný): publikace přes `gh` jen ze schválených souborů, beze změny znění, do `$OUT/PUBLIKACE-LOG.md` tabulka `položka | akce | URL / důvod`, každý zápis znovu načíst. Lokální repo nečíst kvůli úpravám a nepřepínat v něm větev (může tam běžet jiný agent).
- **Board (Haiku):** issue zavřené jako duplikát nebo „nedělá se“ → pole Status „Not Doing“ a prázdný Sprint. Ověřit GraphQL dotazem, ne jen výstupem `item-edit`. Na konci report všech zavřených issues s `stateReason` NOT_PLANNED / duplicate, které na boardu nesedí.

### Brána 3: nové tickety jako user stories

Nové feature tickety vznikají jako návrhy, ne rovnou jako issues:

- **Sonnet** napíše návrhy do `$OUT/US-NAVRHY.md`: titulek ve formátu boardu `US-<další číslo za nejvyšším US na boardu> <Krátký název>`, v těle věta „Jako <role> chci <akce s objektem>, abych <přínos>“, Kontext, Akceptační kritéria, Mimo rozsah, Závislosti, Dokumenty. Kontrola pravidly 1–7 (unikátnost, atomicita, minimalita, bezkonfliktnost, nezávislost, testovatelnost, vlastnictví entity) podle skillu `user-story-check`, u každého návrhu self-check a případné úpravy souvisejících issues („Mimo rozsah“ odkazy).
- PM prochází nedokončené návrhy **po jednom**: u každého jedna karta „problém → navržené řešení“, PM odpoví, jde se na další. Návazná vylepšení, která PM zmíní, jdou jako samostatné enhancement tickety s nižší prioritou.
- Po schválení **Haiku** založí nebo upraví issues doslova podle souboru, nastaví board (Status, Sprint, Sprint Priority dle PM) a ověří.

## Uzávěrka běhu

- Úklid registru (Haiku): otázky `rozhodnuto`, jejichž rozhodnutí má celou dokumentaci `hotovo` s commitem, → `zapsano`; uzavřené PR a tickety → `uzavreno` s důvodem. Commit do PR rutiny.
- Do chatu jeden seznam „co zůstává“ podle role: PM (rozhodnutí, priority bez čísla), PO (věty k odeslání, odešle PM), tech-lead a design, a sledovací issue podmíněných patchů. Max ~15 řádků.

## Když něco selže

- Agent narazí na limit API: hotové soubory nech, zbytek rozděl na menší delegace (viz fáze 2).
- Agent vrátí jiný počet položek, než plán čekal (víc ticketů, chybějící patche): nahlas to PM jednou řádkou s rozdílem, nepřepisuj výsledek potichu.
- Orchestrátor nečte celé výstupy agentů fáze 1, jen konsolidaci; při sporu jednoho nálezu čte jen jeho `Detail`.
