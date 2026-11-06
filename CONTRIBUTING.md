# Jak přispívat

Pravidla projektu jsou v [docs/PROJEKT.md](docs/PROJEKT.md), rozhodnutí v [registru rozhodnutí](docs/rozhodnuti/README.md) a otevřené otázky v [registru otázek](docs/otevrene-otazky/README.md). Tady je praktický postup.

## Postup u jedné story

S agentem stačí `/story <číslo issue>` na začátku a `/story <číslo issue> finish` na konci: skill ověří připravenost story a provede kroky níže včetně přesunů na boardu. Bere číslo issue, ne US (US-99 je #192).

1. **Vyber story** na [boardu](https://github.com/orgs/applifting-vsecourse/projects/12) se štítkem `design: done` nebo `design: not needed` a bez otevřené otázky na PO (ze sloupce Ready nebo Design, filtr `label:"design: done","design: not needed" status:Ready,Design`). Story se štítkem `design: needed` nebo bez štítku `design:` se ještě nevyvíjí. Přiřaď si ji a přesuň do **In progress**. Přečti si akceptační kritéria i sekci _Mimo rozsah_ — co tam je, se nedělá.
2. **Založ větev** z aktuálního `main`:
   ```shell
   git switch main && git pull
   git switch -c feat/US-23-prihlaska-pres-odkaz
   ```
   Prefixy: `feat/`, `fix/`, `chore/`, `docs/`.
3. **Implementuj vertikálně, jeden PR na featuru** — backend, frontend i testy v jedné větvi a v jednom PR, který story pokryje celou a je s ní propojený (`Closes #23`). Merge issue zavře a board ho přesune do In Business Review; do Done ho přesouvá product manager po ověření na stagingu. Story nedělíme na backend a frontend PR ani na „část 1/2“. Míř na cca 400 řádků kódu a 20 souborů (bez testů, migrací, lockfilu a generovaných souborů); když je featura větší, nech ji v jednom PR a v popisu napiš proč. S ostatními se domlouvej ad hoc (viz [PROJEKT.md, sekce 11](docs/PROJEKT.md#11-pracovní-postup)).
4. **Commity** piš anglicky, krátce a v rozkazovacím způsobu: `Add room capacity validation`.
5. **Push** — pre-push hook sám pustí rychlé kontroly (viz [Hooky a AI review](#hooky-a-ai-review)). Před otevřením PR je dobré pustit i `pnpm check-all` (totéž, co CI, včetně integračních testů).
6. **Otevři PR** do `main` jako draft (`gh pr create --draft`). Až je hotový, přepni ho na Ready for review (`gh pr ready`); Codex review běží až potom, takže proběhne nad hotovou prací:
   - název = název story: `US-23 Přihláška přes odkaz` (stane se z něj commit na `main`),
   - Splněná akceptační kritéria (✅ v PR) odškrtni v issue na boardu při otevření PR i při každé jeho úpravě; ❌ a ❓ nech neodškrtnuté,
   - PR k ticketu začíná řádkem `Closes #23`, jinak se s ním v GitHubu nepropojí (`Refs` nestačí); víc ticketů = víc řádků,
   - vyplň šablonu PR,
   - issue přesuň na boardu do **Code review**.
7. **Review** — požádej člena týmu. PR do `main` potřebuje 1 schválení, obejít ho může maintainer nebo admin.
8. **Test** — když je CI zelené, přesuň issue do **In Test**. Tester ([PJjiry](https://github.com/PJjiry)) story otestuje podle akceptačních kritérií ještě před mergem. Když něco nesedí, napíše to do PR a issue vrátí do **In progress**.
9. **Merge** — až po testu od testera a se zeleným CI, squash. Větev se smaže sama. Propojené issue se zavře a board ho přesune do **In Business Review** (workflow boardu „Item closed“).
10. **Product manager** ([Aadikk](https://github.com/Aadikk)) ověří story na stagingu a přesune ji do **Done**.

### Definition of Done

- [ ] všechna akceptační kritéria splněná, logika má testy, `pnpm check-all` je zelený,
- [ ] tester ([PJjiry](https://github.com/PJjiry)) story otestoval před mergem,
- [ ] PR je schválený a mergnutý do `main`,
- [ ] product manager ([Aadikk](https://github.com/Aadikk)) story schválil na stagingu.

## Hooky a AI review

| Hook         | Co dělá                                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | Prettier + ESLint na změněné soubory (lint-staged).                                                                                    |
| `pre-push`   | `pnpm check-fast` (lint, type-check, unit testy BE i FE — bez Dockeru). AI review dělá Codex na PR, integrační testy a build hlídá CI. |

**AI review** dělá u každého PR, který není draft, **Codex** z ChatGPT (GitHub aplikace `chatgpt-codex-connector`, viz [Codex code review](#codex-code-review)). Pravidla bere přes [`AGENTS.md`](AGENTS.md) z agenta `reviewer` ([`.claude/agents/reviewer.md`](.claude/agents/reviewer.md)): co je tam `BLOCKER`, hlásí jako **P0**, `WARNING` jako **P1**, a píše česky jako review komentáře přímo u řádků. Review není povinný check, tvrdá brána je CI (`verify` a `e2e`).

- Znovu spustíš komentářem `@codex review` v PR (i se zaměřením: `@codex review migrace`).
- Přeskočit pre-push kontroly: `git push --no-verify` (jen výjimečně).
- Lokálně kdykoli přes Claude Code: `pnpm ai-review` (`scripts/ai-review.sh`, výstup v `.git/ai-review-last.txt`; `AI_REVIEW_MODEL`, výchozí `sonnet`) nebo `@reviewer`.
- Na každý nález z posledního review odpovídá autor PR (i agent) novým komentářem v PR: `opraveno v <commit>`, nebo `neopravuji — <důvod>`.
- Agent po pushi počká na review daného commitu přes `node scripts/pr-review.mjs wait <pr>` (Codex sám reviewuje jen při otevření PR a při „Ready for review“, ne po pushi; když u aktuálního commitu do minuty nezačne, skript o review požádá komentářem `@codex review`) a odpověď začne řádkem `<!-- ai-review-answer: <sha> -->` (7 znaků reviewovaného commitu). Stop hook v `.claude/settings.json` ho jednou zastaví, když review ještě běží nebo nálezy nemají odpověď. Bez `gh` nebo bez PR na větvi hook nic nedělá.

**Pravidla review se mění jen v `.claude/agents/reviewer.md`**, ne v `AGENTS.md`, hooku ani workflow — Codex i lokální `@reviewer` čtou tentýž seznam. Hlásí-li nesmysly nebo něco přehlíží, oprav agenta v PR.

## Souhrn změn v PR

Každý PR (i od agentů) dostane automaticky jeden krátký komentář **Co se změnilo**: počet commitů a souborů, dotčené moduly a feature, nové endpointy a řádek **Pozor** (příliš velký PR, víc migrací, sdílené soubory, změna kódu bez testu, rozdílné překlady, nové závislosti). Aktualizuje se při každém pushi. Generuje ho `scripts/pr-summary.mjs` z gitu (bez AI, zdarma) ve workflow [`pr-summary.yml`](.github/workflows/pr-summary.yml); lokálně `node scripts/pr-summary.mjs`.

## Paralelní práce (worktrees)

Na víc story najednou (nebo pro víc agentů vedle sebe) neklonuj repo znovu ani nepřepínej větve — založ worktree:

```shell
pnpm wt new feat/US-27-ulozeni-prihlasky   # ../team-1-wt/US-27-ulozeni-prihlasky, větev z origin/main
cd ../team-1-wt/US-27-ulozeni-prihlasky
pnpm dev                                   # migrace, seed a dev servery na portech slotu
claude                                     # agent pracuje jen v tomhle worktree
pnpm wt setup                              # uvnitř worktree založeného jiným nástrojem (t3, Codex): slot, .env, databáze, install
pnpm wt list                               # přehled slotů, větví, portů a stavu PR
pnpm wt rm US-27-ulozeni-prihlasky         # smaže worktree i jeho databázi (větev zůstane)
pnpm wt prune                              # ukáže čisté worktrees s mergnutým PR; `--yes` je smaže i s větví a databází; maže i osiřelé databáze `togena_wt<N>` po worktrees, které smazal jiný nástroj
```

Každý worktree dostane **slot N** (1–9): frontend `3050+10N`, backend `4050+10N`, databáze `togena_wtN` ve stejném Postgresu (`localhost:5433`). Hlavní checkout je slot 0 se standardními porty. Porty a URL se zapíšou do `.env` worktree, takže CORS sedí. Existující větev (lokální nebo z `origin`) se jen checkoutne. Z hlavního checkoutu se zkopíruje i `.claude/settings.local.json`.

Pravidla:

- **Jeden agent = jeden worktree = jedna větev = jedna story.** Agenti nesahají do cizích worktree.
- **Worktree zakládej jen přes `pnpm wt new`** a pak ve VS Code, Claude Code, Codexu nebo t3 otevři tu hotovou složku. Worktrees, které si nástroj založí sám (např. `~/.t3/worktrees/`), nemají vlastní slot a `.env` a srazí se s hlavním checkoutem na portech i databázi. Takový worktree dokonči příkazem `pnpm wt setup` uvnitř něj (bezpečné spustit opakovaně). `pnpm wt list` je označí `(outside wt dir)`.
- Nepoužívej vestavěné worktrees Claude Code (`claude --worktree`) — nemají `.env` a srazí se na portech.
- Sdílené soubory měň jen v rozsahu své story a v PR na to upozorni ([PROJEKT.md, sekce 11](docs/PROJEKT.md#11-pracovní-postup)). Dva paralelní PR, které mění tentýž sdílený soubor, jsou nejčastější zdroj konfliktů.
- Migrace: pořád max. jedna na PR a rebase před merge (viz níže). Každý slot má vlastní DB, takže migrace z jedné větve nerozbije jinou.

## Codex code review

Review běží v cloudu OpenAI a čerpá limity předplatného ChatGPT toho, kdo ho v Codexu zapnul. Žádný runner, secret ani API klíč v repu není. Zprovoznění:

1. Vlastník organizace `applifting-vsecourse` schválí GitHub aplikaci ChatGPT (Codex) pro repozitář `team-1` (GitHub → organizace → Settings → GitHub Apps / žádost o instalaci).
2. Na [chatgpt.com/codex](https://chatgpt.com/codex) propoj GitHub a vyber repozitář `team-1`.
3. V nastavení Codexu u repozitáře zapni **Code review → Automatic review** (potřebuje práva push/admin k repu).
4. Ověření: v libovolném PR, který není draft, napiš `@codex review`. Codex dá 👀, založí v PR komentář „Codex Review Summary“ se stavem a pošle review s nálezy u řádků (bez nálezů dá 👍). Stav review (commit, běží/hotovo, nálezy) čte `pr-review.mjs` ze skrytého řádku `codex-review-state` v tom komentáři.

Když dojdou limity předplatného, review do dalšího okna neproběhne; `pr-review.mjs` pak skončí `FAILED` nebo `TIMEOUT`. Nastavení Codexu pro repo: [chatgpt.com/codex/cloud/settings/general](https://chatgpt.com/codex/cloud/settings/general).

## Pravidla `main`

- Jen přes PR, CI (`verify` a `e2e`) musí projít, force-push je zakázaný. Platí i pro adminy.
- 1 povinné schválení, obejít ho může maintainer nebo admin.
- Jen squash merge.

## Příkazy

```shell
pnpm dev                            # env soubory, Postgres v Dockeru, migrace, seed, oba dev servery
pnpm check-all                      # lint + type-check + testy + build (totéž co CI)
pnpm backend test                   # unit testy backendu (Jest, bez DB)
pnpm backend test:int               # integrační testy: sestaví a spustí backend proti DB togena_test
pnpm frontend test:ci               # testy frontendu (Vitest)
pnpm e2e test                       # E2E testy hlavních cest (Playwright, pravidla v docs/E2E.md)
pnpm backend prisma:migrations:run  # vytvoří a aplikuje migraci po změně schématu
pnpm backend prisma:studio          # prohlížeč dat
pnpm backend db:reset               # čistá DB + seed
pnpm dev:down                       # zastaví databázi
pnpm format                         # Prettier na celý repozitář
```

| Co       | Kde                                                          |
| -------- | ------------------------------------------------------------ |
| Frontend | http://localhost:3050                                        |
| API      | http://localhost:4050/api                                    |
| Swagger  | http://localhost:4050/api/docs                               |
| Auth API | http://localhost:4050/api/auth/reference                     |
| DB       | Postgres na `localhost:5433`, `togena` / `togena` / `togena` |

### Účty ze seedu

Registrace je vypnutá (ve sprintu 1 se nikdo neregistruje), takže se přihlašuj účty ze seedu:

| E-mail                     | Heslo           | Typ         | Co vidí                                                            |
| -------------------------- | --------------- | ----------- | ------------------------------------------------------------------ |
| `organizator@example.com`  | `password1`     | organizátor | Letní kemp z. s. — „Letní kemp 2027“ a akce pro Sprint Demo (níže) |
| `organizator2@example.com` | `password2`     | organizátor | Horský spolek Sněžka — akce „Horský víkend 2027“ (s náhradnicí)    |
| `organizator3@example.com` | `password3`     | organizátor | obě organizace (akce seskupené podle pořadatele)                   |
| `ucastnik@example.com`     | `password4`     | účastník    | přihláška na oba týdny Letního kempu, zaplaceno                    |
| `admin@example.com`        | `adminpassword` | admin       | zatím nic (bez UI)                                                 |

Odkazy na přihlášku ze seedu: `/apply/demo-letni-kemp-2027` a `/apply/demo-horsky-vikend-2027`. Skutečné akce dostanou náhodný token.

Akce pro Sprint Demo (organizace Letní kemp z. s., vidí je `organizator@example.com` a `organizator3@example.com`):

| Akce                     | Odkaz na přihlášku                | Co v ní je                                                                                                                                                     |
| ------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| „Letní kemp 2027 – demo“ | `/apply/demo-letni-kemp-plny`     | 10 dámských + 10 pánských pokojů po 5 lůžkách, 2 termíny, 145 přihlášek. 1. termín: 50 + 48 potvrzených, 2 náhradnice. 2. termín: plno, 3 ženy a 2 muži čekají |
| „Rodinný víkend 2027“    | `/apply/demo-rodinny-vikend-2027` | společné pokoje bez pohlaví (7 lůžek), 8 přihlášek, poslední je náhradník                                                                                      |
| „Zimní výjezd 2028“      | `/apply/demo-zimni-vyjezd-2028`   | rozpracovaná: termín s cenou, bez pokojů — přehled ukáže, co chybí, odkaz vrací 404                                                                            |

V „Letním kempu 2027 – demo“ je jedno odeslání se dvěma účastníky pod `rodina.vesela@example.com`, každý čtvrtý zaplatil celé, každý čtvrtý polovinu a jedna přihláška má přeplatek 500 Kč.

Porty jsou zafixované: API přijímá požadavky jen z přesného originu frontendu, takže posunutý port se projeví jako CORS chyba.

E-maily se lokálně vypisují do terminálu backendu.

## Změna datového modelu

**Jedna migrace na PR.** Než PR mergneš, rebasni na `main`. Pokud mezitím přibyla jiná migrace, smaž tu svoji a vygeneruj ji znovu (`pnpm backend prisma:migrations:run`). Dvě migrace ze dvou větví, které na sobě nestojí, rozbijí `migrate deploy` na stagingu.

**Jedna změna schématu naráz.** Rozpracovaná smí být nejvýš jedna story, která mění `schema.prisma`. Než ji začneš, ověř, že schéma nemění žádný otevřený PR ani jiný worktree. Když ano, vezmi jinou story nebo počkej.

## Konflikty v generovaných souborech

- `apps/frontend/src/routeTree.gen.ts` — nespojuj ručně. Vezmi libovolnou stranu a pusť `pnpm frontend build`; soubor se přegeneruje z rout.
- `pnpm-lock.yaml` — vezmi verzi z `main` a pusť `pnpm install`.

## Staging

- https://team-1.vsepractical.applifting.dev — po každém merge do `main` se sestaví a nasadí (`.github/workflows/deploy.yml`, několik minut).
- Logy: https://logs.vsepractical.applifting.dev, databáze: https://db.vsepractical.applifting.dev (přístupy má tech lead).
- Env proměnné stagingu spravuje kurz (Coolify), my k nim přístup nemáme.
- Při každém startu backend aplikuje migrace a spustí seed. Seed se přeskočí, když v DB už je organizace, takže data z dema zůstanou. Účty jsou stejné jako lokálně (viz výše), jen bez admina.
- **Reset stagingu na čistá ukázková data:** v [Admineru](https://db.vsepractical.applifting.dev) spusť `TRUNCATE organization CASCADE;` a pak v GitHub Actions ručně spusť workflow **Build & Deploy** (Run workflow). Seed po startu vymaže zbytek a vytvoří data znovu.
- Frontend má URL API zapečenou při buildu (`VITE_*` jsou build args).

## Když něco nefunguje

| Příznak                                              | Příčina / řešení                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` hned spadne na chybě Dockeru              | Docker neběží. Spusť ho a zkus znovu.                                                                                 |
| `port 5433 is already allocated`                     | Běží databáze jiného projektu (třeba jiný klon starteru). Zastav ji: `docker ps` a `docker stop <název>`.             |
| `Port 3050 is already in use` / `EADDRINUSE :::4050` | Běží stará instance. `lsof -i :3050` (nebo `:4050`) a proces ukonči.                                                  |
| Stránka se načte, ale přihlášení hlásí CORS chybu    | Frontend běží na jiném portu, než API čeká (viz výše).                                                                |
| Prisma: „column does not exist“                      | Změnil se `schema.prisma` bez migrace: `pnpm backend prisma:migrations:run`.                                          |
| Chci zpátky ukázková data                            | `pnpm backend db:reset`. Samotný `pnpm backend seed` existující DB nepřepíše — když v ní jsou uživatelé, přeskočí se. |
| Commit zablokuje lint nebo formátování               | Pre-commit hook opraví, co jde; zbytek oprav ručně. `git commit --no-verify` jen výjimečně — CI to stejně chytí.      |
| V prohlížeči červený overlay při psaní               | To je kontrola typů a lintu, ne pád aplikace. Přečti hlášku.                                                          |
