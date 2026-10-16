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
5. **Před pushem** pusť `pnpm check-all` (totéž, co CI).
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

## Pravidla `main`

- Jen přes PR, CI (`verify`) musí projít, force-push je zakázaný. Platí i pro adminy.
- 0 povinných schválení — autor může mergnout sám.
- Jen squash merge.

## Příkazy

```shell
pnpm dev                            # env soubory, Postgres v Dockeru, migrace, seed, oba dev servery
pnpm check-all                      # lint + type-check + testy + build (totéž co CI)
pnpm backend test                   # unit testy backendu (Jest)
pnpm frontend test:ci               # testy frontendu (Vitest)
pnpm backend prisma:migrations:run  # vytvoří a aplikuje migraci po změně schématu
pnpm backend prisma:studio          # prohlížeč dat
pnpm backend db:reset               # čistá DB + seed
pnpm dev:down                       # zastaví databázi
pnpm format                         # Prettier na celý repozitář
```

| Co       | Kde                                                    |
| -------- | ------------------------------------------------------ |
| Frontend | http://localhost:3050                                  |
| API      | http://localhost:4050/api                              |
| Swagger  | http://localhost:4050/api/docs                         |
| Auth API | http://localhost:4050/api/auth/reference               |
| DB       | Postgres na `localhost:5433`, `kemp` / `kemp` / `kemp` |

### Účty ze seedu

Registrace je vypnutá (ve sprintu 1 se nikdo neregistruje), takže se přihlašuj účty ze seedu:

| E-mail                     | Heslo           | Typ         | Co vidí                                                         |
| -------------------------- | --------------- | ----------- | --------------------------------------------------------------- |
| `organizator@example.com`  | `password1`     | organizátor | Letní kemp z. s. — akce „Letní kemp 2027“                       |
| `organizator2@example.com` | `password2`     | organizátor | Horský spolek Sněžka — akce „Horský víkend 2027“ (s náhradnicí) |
| `organizator3@example.com` | `password3`     | organizátor | obě organizace (akce seskupené podle pořadatele)                |
| `ucastnik@example.com`     | `password4`     | účastník    | přihláška na oba týdny Letního kempu, zaplaceno                 |
| `admin@example.com`        | `adminpassword` | admin       | zatím nic (bez UI)                                              |

Odkazy na přihlášku ze seedu: `/prihlaska/demo-letni-kemp-2027` a `/prihlaska/demo-horsky-vikend-2027`. Skutečné akce dostanou náhodný token.

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
