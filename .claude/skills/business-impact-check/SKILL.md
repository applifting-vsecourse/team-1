---
name: business-impact-check
description: Kontrola dopadu byznys rozhodnutí nebo změny business dokumentace Togeny (team-1) na celé repo, tickety a PR. Najde otevřené otázky, které se rozhodnutím uzavřely, pozůstatky starého stavu, dotazy vývojářů v PR na product managera a rozhodnutí k zapsání nebo změněná dřívější rozhodnutí. Použij po změně modelů (volá ji skill model-update), po novém rozhodnutí („rozhodl jsem, že…“, „co všechno tohle ovlivní“, „zkontroluj dopady“, „jsou někde ještě pozůstatky starého stavu“) nebo na dotaz po otevřených otázkách.
---

# Kontrola dopadu byznys rozhodnutí

Pracuje se v repu Togena (kořen repozitáře). Uživatel je autor business dokumentace a product manager (GitHub `Aadikk`). Rozhodnutí o byznys pravidlech jsou jeho, skill je nevymýšlí.

**Vstup:** seznam změn a rozhodnutí (od skillu `model-update` nebo od uživatele), nebo jen téma. Když vstup chybí, zeptej se, jaké rozhodnutí nebo jaké téma se kontroluje. **Výstup:** tabulky nálezů a návrh zápisů. Do `docs/` zapisuješ až po potvrzení, do ticketů a PR nikdy sám.

Spouští se i bez změny modelů. Když se rozhodnutí modelů netýká, kontrola proběhne stejně.

## A. Otevřené otázky a pozůstatky starého stavu
Zjisti, jestli se rozhodnutím nějaká otevřená otázka neuzavřela, a najdi všude, kde zůstal starý stav.

1. Vypiš otevřené otázky ze všech míst z tabulky níže. Ke každé: je uzavřená tímto rozhodnutím? Ano → navrhni zápis o uzavření a odstranění otázky tam, kde je. Ne → nech.
2. Pro každý pojem, stav, e-mail, pravidlo nebo číslo, které se změnilo, vyhledej **staré znění** (`grep -rn` v `docs/`, `apps/`, `.github/`; `gh search issues|prs` s původním textem) a vypiš každý výskyt: soubor nebo odkaz, citace, co s ním (přepsat, doplnit poznámku, jen nahlásit).
3. **Tickety a PR hledej vždy**, ne jen když je zadal uživatel:
   - **Tickety (user stories):** otevřené otázky jsou v ticketu (sekce s otázkami, komentáře). Projdi otevřené i nedávno zavřené tickety: `gh issue list --state all --search "<pojem>"`, `gh issue view <č> --comments`. Hledej otázky, které rozhodnutí uzavřelo, a popis nebo akceptační kritéria se starým stavem.
   - **PR:** vývojáři v nich dávají dotazy na uživatele (`Aadikk`), když potřebují byznys rozhodnutí; jsou v popisu (Nejasnosti k byznys pravidlům, Odchylky) i v komentářích. Projdi otevřené PR: `gh pr list --state open`, `gh pr view <č> --comments`. Hledej dotazy, které rozhodnutí zodpovědělo, dotazy dosud bez odpovědi a kód nebo popis PR ze starého stavu.
   - Výsledek je tabulka **odkaz, autor, otázka nebo starý stav (doslova), dopad rozhodnutí, navržená akce**. Navrhni konkrétní text: odpověď do PR česky (skill `my-writing-style`) nebo přepsání části ticketu.
   - Do ticketu ani PR **nic nezapisuj** (komentář, `gh issue edit`, `gh pr comment`): je to veřejné a uživatel to musí schválit, navržený text mu jen předlož.
4. Co leží mimo `docs/` (kód, šablony e-mailů, i18n texty, Figma), se nemění, jen se **nahlásí** s odkazem.
5. **Registr otevřených otázek** je `docs/otevrene-otazky/otazky.yaml` (zdroj pravdy; `README.md` je z něj generovaný, needituj ho; schéma v `SCHEMA.md`). Otázky mají ID `Q-<epic>-NN` (např. `Q-PRI-04`), stav `otevreno` / `rozhodnuto` / `zapsano` / `uzavreno`, `ceka_na` (role `pm`, `tech-lead`, `design`, `qa`, `po`; klient je `po`), prioritu `P0` až `P3` a `rozhodnuti_ref` na rozhodnutí v registru rozhodnutí. Registr zastarává, jeho obsah vždy porovnej s aktuálním stavem v ticketech a PR (`gh issue view`, `gh pr view`). U každé dotčené otázky navrhni: uzavřít (`rozhodnuti_ref` + stav, nebo `uzavreno_duvod`), změnit prioritu nebo `ceka_na`, nebo přidat novou otázku s dalším ID. Po zápisu spusť `python3 -I docs/otevrene-otazky/generate.py` a `python3 -I docs/rozhodnuti/generate.py`; oba musí projít (`--check`). Zápis dělej na větvi s úpravou dokumentace; před zápisem se zeptej, na které.
6. Navíc hledej otevřené body v `docs/PROJEKT.md` (sekce Otevřené body), v `EMAILY.md` (konflikty) a v PR a ticketech.

## B. Rozhodnutí
1. Z nálezů a konverzace vyber každé **nové rozhodnutí** uživatele (zdroj, datum, doslovně). Pro každé: je zapsané v registru rozhodnutí (`docs/rozhodnuti/rozhodnuti.yaml`)? Navrhni zápis: nový záznam s dalším ID `D-<nnn>`, `typ`, `oblast`, `rozhodl` (role), `zdroj`, `z_otazek` a `dokumentace` (co se má zapsat, stav `ceka`); u zodpovězené otázky nastav `rozhodnuti_ref` a stav `rozhodnuto`. Rozhodnutí navržené někým jiným a nepotvrzené uživatelem dostane stav `navrh`. Po zápisu do dokumentace přepni příslušnou `dokumentace` na `hotovo` s commitem a otázku na `zapsano`.
2. Ke každému novému rozhodnutí najdi dřívější rozhodnutí, která se jím **mění nebo ruší** (v `docs/rozhodnuti/rozhodnuti.yaml`, `SLOVNIK.md`, `EMAILY.md`, README režimů, popisech PR a ticketech). Ukaž dvojice „dřív × teď“. Staré rozhodnutí nemaž: přidej nové s datem a propoj je (`nahrazuje` / `nahrazeno_v` při úplné výměně, `meni` / `zmeneno_v` při částečné změně; staré pak dostane stav `nahrazene`, historie zůstane).
3. Rozpor mezi dvěma rozhodnutími, který neumíš rozřešit, nech jako otázku pro uživatele. Neodhaduj.

## Kde hledat a co zapsat
Kontroluj všechna místa, vynech jen ta, kterých se změna zjevně netýká.

| Místo | Co zkontrolovat nebo zapsat |
| --- | --- |
| `docs/procesy/**/*.yaml` a generované `.md` | Model samotný; sdílená část v obou režimech |
| `docs/procesy/zpracovani-prihlasky/README.md` | Tabulka rozdílů režimů, přehled |
| `docs/procesy/zpracovani-prihlasky/EMAILY.md` | Řádky e-mailů, konflikty na začátku (uzavřené odstranit) |
| `docs/rozhodnuti/rozhodnuti.yaml` (generovaný `README.md`) | Nové rozhodnutí, řetězce změn, `dokumentace` (co zapsat, `hotovo` s commitem); po úpravě `generate.py` |
| `docs/PROJEKT.md` | Klíčová pravidla (sekce 5), sekce 12 Otevřené body, datový model, trasy, API; rozhodnutí tu už nejsou, jen odkaz na registr |
| `docs/SLOVNIK.md` | Pojmy, tabulka stavů, class diagram |
| `docs/FIGMA-REMAKE.md`, Figma | Jen nahlásit rozpor (texty, stavy, obrazovky) |
| `docs/E2E.md` | Hlavní cesty, kterých se změna týká |
| `CLAUDE.md`, `CONTRIBUTING.md` | Pravidla a definice hotového, pokud se změnily |
| `docs/otevrene-otazky/otazky.yaml` | Uzavřené otázky (`rozhodnuti_ref`, stav), změna priority a `ceka_na`, nové otázky s dalším ID, `navazne_tickety` (url `null` = ticket k založení); vždy ověř proti ticketům a PR |
| GitHub tickety / user stories (`.github/ISSUE_TEMPLATE/user-story.md`) | Otevřené otázky v ticketu a komentářích (uzavřené rozhodnutím); popis a akceptační kritéria se starým stavem; návrh přepsání (bez zápisu) |
| Otevřené PR (popis, komentáře) | Dotazy vývojářů na uživatele (zodpovězené i dosud nezodpovězené); sekce Nejasnosti a Odchylky; kód nebo popis ze starého stavu; návrh odpovědi česky (bez zápisu) |
| Backend `apps/backend/src/modules/applications/domain`, šablony e-mailů (např. `application-confirmation-waitlisted`), `apps/frontend/src/i18n/locales`, seed | Jen nahlásit, kde kód nebo texty neodpovídají rozhodnutí |

## Výstup
- Tabulky: uzavřené otázky, zbylé pozůstatky starého stavu, nezodpovězené dotazy v PR a ticketech, rozhodnutí k zapsání, změněná dřívější rozhodnutí.
- Návrhy zápisů do `docs/` s konkrétním textem a místem. Po potvrzení je zapiš. Prettier při commitu přeformátuje `.md`, hledej text podle aktuálního souboru.
- Návrhy komentářů do PR a úprav ticketů jen jako text k schválení.
- Zeptej se, jestli commitnout a pushnout (commit anglicky, dokumenty česky, `Co-Authored-By` podle připomenutí; PR ani push bez výslovného pokynu, memory `team1-no-pr-without-ask`).

## Co nedělat
- Nerozhodovat byznys pravidla ani nepřebírat výklad z komentářů jiných lidí.
- Nepsat do ticketů a PR, neměnit kód aplikace ani Figmu.
- Nemazat historická rozhodnutí.
