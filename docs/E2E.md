# E2E testy (Playwright)

E2E test proklikává aplikaci ve skutečném prohlížeči proti skutečnému backendu a databázi. Je pomalý a křehký, proto jich máme **málo a jen na hlavní cesty**. Všechno ostatní patří do levnějších testů.

## Kam patří jaký test

| Co ověřuju                                                     | Test                                |
| -------------------------------------------------------------- | ----------------------------------- |
| Výpočet (kapacita, vyhodnocení, cena, dluh)                    | unit test v `domain/` (backend)     |
| Endpoint, oprávnění (401/403), validace, e-maily, magic link   | API test `*.int-spec.ts` (backend)  |
| Komponenta, formulář, chybové hlášky, prázdné stavy            | Vitest + Testing Library (frontend) |
| **Uživatel projde celou cestu napříč obrazovkami a backendem** | **E2E v `apps/e2e`**                |

Když jde věc ověřit nižším testem, E2E pro ni nepiš.

## Co testujeme

Jen cesty, bez kterých produkt nefunguje a které ukazujeme na demu. Jedna cesta = jeden `test(...)`.

| Cesta                                                                               | Soubor                 | Stav                 |
| ----------------------------------------------------------------------------------- | ---------------------- | -------------------- |
| Landing → přihlášení organizátora → dashboard → odhlášení                           | `sign-in.spec.ts`      | ✅                   |
| Účastník se nedostane do správy akcí (403)                                          | `sign-in.spec.ts`      | ✅                   |
| Účastník: přihlášení heslem a odhlášení (i na mobilu)                               | `sign-in.spec.ts`      | ✅                   |
| Účastník: žádost o magic link → otevření odkazu → přihlášen (i na mobilu)           | `magic-link.spec.ts`   | ✅                   |
| Nový účastník: magic link → nastavení hesla → přihlášení novým heslem (i na mobilu) | `set-password.spec.ts` | ✅                   |
| Přihláška přes odkaz: termíny a cena podle výběru (i na mobilu)                     | `application.spec.ts`  | ✅                   |
| Odeslání přihlášky → stav potvrzený / náhradník a kolik a kam zaplatit              | `application.spec.ts`  | ✅                   |
| Organizátor založí akci s termíny a pokoji a zkopíruje odkaz na přihlášku           | `event-setup.spec.ts`  | po US-12, 13, 14, 16 |
| Organizátor vidí přihlášku v seznamu a zapíše platbu                                | `payments.spec.ts`     | po US-52 a US-44     |

Novou cestu přidej do tabulky v tomtéž PR. Cesta mimo tabulku se domlouvá s tech leadem. Okrajové stavy (chybné heslo, prošlý odkaz…) do E2E nepatří, pokud nejsou součástí hlavní cesty.

## Pravidla psaní

1. **Krátce.** Test do ~20 řádků. Když je delší, testuješ moc věcí najednou.
2. **Jako uživatel.** Hledej prvky tak, jak je vidí člověk: `getByRole`, `getByLabel`, `getByText`. Žádné CSS třídy, `nth-child` ani XPath. `data-testid` jen výjimečně, když prvek nemá roli ani text.
3. **Anglické texty.** Prohlížeč běží v `en-GB`, takže lokátory používají anglické texty z `locales/en`. Když změníš text v UI, oprav i test.
4. **Žádné čekání natvrdo.** Nikdy `waitForTimeout`. `expect(...)` čeká sám.
5. **Testy na sobě nezávisí.** Každý začíná sám (`page.goto`), žádné pořadí ani sdílený stav mezi testy. Data, která test vytvoří, mají unikátní hodnoty (např. e-mail s `Date.now()`).
6. **Data ze seedu.** Databáze `togena_e2e` se před každým během smaže a znovu naplní seedem. Účty a odkazy jsou v `tests/support/accounts.ts`. Seed měň jen s vědomím, že na něm E2E stojí.
7. **Opakované kroky do helperu.** Přihlášení a podobně patří do `tests/support/`, ne kopírovat do každého testu.
8. **Mobil jen tam, kde na něm záleží.** Tag `@mobile` dostávají jen cesty účastníka. Ostatní běží jen na desktopu.
9. **Žádné `test.only`.** CI ho odmítne. `test.fixme` jen pro domluvenou cestu z tabulky, která čeká na story.

## Spuštění

Postgres musí běžet (`pnpm backend docker:up:wait`). Při prvním spuštění stáhni prohlížeč:

```bash
pnpm e2e browsers   # jednorázově: stáhne Chromium
pnpm e2e test       # sestaví a spustí backend (4190) + frontend (3190) a projede testy
pnpm e2e test:ui    # interaktivně, krok po kroku
pnpm e2e report     # HTML report posledního běhu
```

E2E má vlastní porty a databázi, takže nevadí běžícímu `pnpm dev` ani worktree. Dva běhy E2E naráz ale nespouštěj, sdílí porty.

V CI běží E2E jako samostatný job `e2e` u každého PR. Když spadne, stáhni artefakt `playwright-report` (screenshot a trace kroku, který selhal).
