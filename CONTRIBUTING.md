# Jak přispívat

Pravidla a rozhodnutí projektu jsou v [docs/PROJEKT.md](docs/PROJEKT.md). Tady je praktický postup.

## Postup u jedné story

1. **Vyber story** na [boardu](https://github.com/orgs/applifting-vsecourse/projects/12) ze sloupce Ready, přiřaď si ji a přesuň do **In progress**. Přečti si akceptační kritéria i sekci _Mimo rozsah_ — co tam je, se nedělá.
2. **Založ větev** z aktuálního `main`:
   ```shell
   git switch main && git pull
   git switch -c feat/US-23-prihlaska-pres-odkaz
   ```
   Prefixy: `feat/`, `fix/`, `chore/`, `docs/`.
3. **Implementuj vertikálně** — backend, frontend i testy v jedné větvi. Drž se modulu a feature složky svého proudu (viz [PROJEKT.md, sekce 6](docs/PROJEKT.md#6-plán-práce-ve-sprintu-1)).
4. **Commity** piš anglicky, krátce a v rozkazovacím způsobu: `Add room capacity validation`.
5. **Push** — pre-push hook sám pustí rychlé kontroly a AI review (viz [Hooky a AI review](#hooky-a-ai-review)). Před otevřením PR je dobré pustit i `pnpm check-all` (totéž, co CI, včetně integračních testů).
6. **Otevři PR** do `main`:
   - název = název story: `US-23 Přihláška přes odkaz` (stane se z něj commit na `main`),
   - v těle `Refs #23` — **ne** `Closes`, issue zavírá product manager,
   - vyplň šablonu PR.
7. **Review** — požádej člena týmu. Povinné není, ale doporučené — zvlášť u schématu, auth a doménové logiky.
8. **Merge** — squash, až je CI zelené. Větev se smaže sama. Issue přesuň do **In review**.
9. **Product manager** ([Aadikk](https://github.com/Aadikk)) ověří story na stagingu a issue zavře → **Done**.

### Definition of Done

- [ ] všechna akceptační kritéria splněná, logika má testy, `pnpm check-all` je zelený,
- [ ] PR je mergnutý do `main` (review doporučené),
- [ ] product manager ([Aadikk](https://github.com/Aadikk)) story schválil na stagingu.

## Hooky a AI review

| Hook         | Co dělá                                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | Prettier + ESLint na změněné soubory (lint-staged).                                                                                                                           |
| `pre-push`   | `pnpm check-fast` (lint, type-check, unit testy BE i FE — bez Dockeru), pak AI review (`scripts/ai-review.sh`, totéž co `pnpm ai-review`). Integrační testy a build hlídá CI. |

**AI review** (`scripts/ai-review.sh`) pošle diff větve proti `origin/main` agentovi `reviewer` ([`.claude/agents/reviewer.md`](.claude/agents/reviewer.md)), který ho porovná s CLAUDE.md, PROJEKT.md a DESIGN.md. Nálezy jsou `BLOCKER`, `WARNING` a `NOTE`; **push zastaví jen `BLOCKER`**. Celý výstup posledního běhu je v `.git/ai-review-last.txt`.

- Kdo nemá [Claude Code](https://claude.com/claude-code), tomu se AI review přeskočí — rychlé kontroly běží dál.
- Když review nedoběhne (síť, limit), push projde s varováním. Tvrdá brána je CI.
- Přeskočit jen AI review: `SKIP_AI_REVIEW=1 git push`. Přeskočit všechno: `git push --no-verify` (jen výjimečně).
- Model a strop: `AI_REVIEW_MODEL` (výchozí `sonnet`), `AI_REVIEW_BUDGET` (výchozí 0,50 USD na běh, platí pro API klíč).
- Ručně kdykoli: `pnpm ai-review`, v Claude Code `@reviewer`.

**Pravidla review se mění jen v `.claude/agents/reviewer.md`**, ne v hooku ani ve workflow — stejný agent běží lokálně i na Raspberry Pi. Hlásí-li nesmysly nebo něco přehlíží, oprav agenta v PR.

## Paralelní práce (worktrees)

Na víc story najednou (nebo pro víc agentů vedle sebe) neklonuj repo znovu ani nepřepínej větve — založ worktree:

```shell
pnpm wt new feat/US-27-ulozeni-prihlasky   # ../team-1-wt/US-27-ulozeni-prihlasky, větev z origin/main
cd ../team-1-wt/US-27-ulozeni-prihlasky
pnpm dev                                   # migrace, seed a dev servery na portech slotu
claude                                     # agent pracuje jen v tomhle worktree
pnpm wt list                               # přehled slotů, větví a portů
pnpm wt rm US-27-ulozeni-prihlasky         # smaže worktree i jeho databázi (větev zůstane)
```

Každý worktree dostane **slot N** (1–9): frontend `3050+10N`, backend `4050+10N`, databáze `togena_wtN` ve stejném Postgresu (`localhost:5433`). Hlavní checkout je slot 0 se standardními porty. Porty a URL se zapíšou do `.env` worktree, takže CORS sedí. Existující větev (lokální nebo z `origin`) se jen checkoutne.

Pravidla:

- **Jeden agent = jeden worktree = jedna větev = jedna story.** Agenti nesahají do cizích worktree.
- Nepoužívej vestavěné worktrees Claude Code (`claude --worktree`) — nemají `.env` a srazí se na portech.
- Drž se složek svého proudu ([PROJEKT.md, sekce 6](docs/PROJEKT.md#kdo-sahá-kam-aby-se-proudy-nepraly-o-soubory)). Dva paralelní PR, které mění tentýž sdílený soubor, jsou nejčastější zdroj konfliktů.
- Migrace: pořád max. jedna na PR a rebase před merge (viz níže). Každý slot má vlastní DB, takže migrace z jedné větve nerozbije jinou.

## Raspberry Pi runner (připraveno, zatím vypnuto)

Workflow [`.github/workflows/ai-review.yml`](.github/workflows/ai-review.yml) jednou denně (pracovní dny 7:00) projde otevřené PR změněné za poslední den a výsledek review přidá jako komentář. Jde spustit i ručně (Actions → AI review → Run workflow, volitelně číslo PR). Běží na self-hostovaném runneru s labelem `pi`, se stejným agentem `reviewer`, ale levně:

- model `haiku`, strop `AI_REVIEW_BUDGET` (výchozí 0,10 USD) na PR, max. `AI_REVIEW_MAX_PRS` (5) PR na běh, diff oříznutý na 60 kB,
- skript a agent se berou z `main`, ne z PR, a projektová nastavení Claude (`.claude/` z PR) se nenačítají — PR si nemůže přepsat vlastního reviewera ani spustit kód přes hooky.

Zprovoznění (až bude Pi):

1. Na Pi (64bit Raspberry Pi OS) nainstaluj Node 24, pnpm, `gh` a Claude Code CLI.
2. Repo → Settings → Actions → Runners → New self-hosted runner (Linux, ARM64), při registraci přidej label `pi`. Spusť ho jako službu (`./svc.sh install && ./svc.sh start`).
3. Repo → Settings → Secrets: `ANTHROPIC_API_KEY` (klíč s měsíčním limitem v Anthropic Console).
4. Repo → Settings → Variables: `AI_REVIEW_ENABLED=true`, volitelně `AI_REVIEW_BUDGET`, `AI_REVIEW_MAX_PRS`.

Dokud `AI_REVIEW_ENABLED` není `true`, workflow se přeskočí.

## Pravidla `main`

- Jen přes PR, CI (`verify`) musí projít, force-push je zakázaný. Platí i pro adminy.
- 0 povinných schválení — autor může mergnout sám.
- Jen squash merge.

## Příkazy

```shell
pnpm dev                            # env soubory, Postgres v Dockeru, migrace, seed, oba dev servery
pnpm check-all                      # lint + type-check + testy + build (totéž co CI)
pnpm backend test                   # unit testy backendu (Jest, bez DB)
pnpm backend test:int               # integrační testy: sestaví a spustí backend proti DB togena_test
pnpm frontend test:ci               # testy frontendu (Vitest)
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

| E-mail                     | Heslo           | Typ         | Co vidí                                                         |
| -------------------------- | --------------- | ----------- | --------------------------------------------------------------- |
| `organizator@example.com`  | `password1`     | organizátor | Letní kemp z. s. — akce „Letní kemp 2027“                       |
| `organizator2@example.com` | `password2`     | organizátor | Horský spolek Sněžka — akce „Horský víkend 2027“ (s náhradnicí) |
| `organizator3@example.com` | `password3`     | organizátor | obě organizace (akce seskupené podle pořadatele)                |
| `ucastnik@example.com`     | `password4`     | účastník    | přihláška na oba týdny Letního kempu, zaplaceno                 |
| `admin@example.com`        | `adminpassword` | admin       | zatím nic (bez UI)                                              |

Odkazy na přihlášku ze seedu: `/apply/demo-letni-kemp-2027` a `/apply/demo-horsky-vikend-2027`. Skutečné akce dostanou náhodný token.

Porty jsou zafixované: API přijímá požadavky jen z přesného originu frontendu, takže posunutý port se projeví jako CORS chyba.

E-maily se lokálně vypisují do terminálu backendu.

## Změna datového modelu

**Jedna migrace na PR.** Než PR mergneš, rebasni na `main`. Pokud mezitím přibyla jiná migrace, smaž tu svoji a vygeneruj ji znovu (`pnpm backend prisma:migrations:run`). Dvě migrace ze dvou větví, které na sobě nestojí, rozbijí `migrate deploy` na stagingu.

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
