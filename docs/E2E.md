# E2E testy (Playwright)

E2E test proklik�v� aplikaci ve skute�n�m prohl��e�i proti skute�n�mu backendu a datab�zi. Je pomal� a k�ehk�, proto jich m�me **m�lo a jen na hlavn� cesty**. V�echno ostatn� pat�� do levn�j�ch test�.

## Kam pat�� jak� test

| Co ov��uju                                                     | Test                                |
| -------------------------------------------------------------- | ----------------------------------- |
| V�po�et (kapacita, vyhodnocen�, cena, dluh)                    | unit test v `domain/` (backend)     |
| Endpoint, opr�vn�n� (401/403), validace, e-maily, magic link   | API test `*.int-spec.ts` (backend)  |
| Komponenta, formul��, chybov� hl��ky, pr�zdn� stavy            | Vitest + Testing Library (frontend) |
| **U�ivatel projde celou cestu nap��� obrazovkami a backendem** | **E2E v `apps/e2e`**                |

Kdy� jde v�c ov��it ni��m testem, E2E pro ni nepi�.

## Co testujeme

Jen cesty, bez kter�ch produkt nefunguje a kter� ukazujeme na demu. Jedna cesta = jeden `test(...)`.

| Cesta                                                                                   | Soubor                       | Stav |
| --------------------------------------------------------------------------------------- | ---------------------------- | ---- |
| Landing  p�ihl��en� organiz�tora  seznam akc�  odhl��en�                             | `sign-in.spec.ts`            | ?   |
| Organiz�tor po p�ihl��en� skon�� na p�ehledu naposledy otev�en� akce                    | `sign-in.spec.ts`            | ?   |
| �astn�k se nedostane do spr�vy akc� (403)                                              | `sign-in.spec.ts`            | ?   |
| Organiz�tor neotev�e akci ciz� organizace (403)                                         | `sign-in.spec.ts`            | ?   |
| �astn�k: p�ihl��en� heslem a odhl��en� (i na mobilu)                                   | `sign-in.spec.ts`            | ?   |
| �astn�k: ��dost o magic link  otev�en� odkazu  p�ihl��en (i na mobilu)               | `magic-link.spec.ts`         | ?   |
| Nov� ��astn�k: magic link  nastaven� hesla  p�ihl��en� nov�m heslem (i na mobilu)     | `set-password.spec.ts`       | ?   |
| P�ihl��ka p�es odkaz: term�ny a cena podle v�b�ru (i na mobilu)                         | `application.spec.ts`        | ?   |
| Odesl�n� p�ihl��ky  str�nka potvrzen�  po p�ihl��en� vid� p�ihl��ku se stavem         | `application.spec.ts`        | ?   |
| Organiz�tor zalo�� akci s term�nem a cenou, p�id� pokoj term�nu a zkop�ruje odkaz       | `event-setup.spec.ts`        | ?   |
| Organiz�tor otev�e akci  Kapacity  obsazenost term�nu a odkaz na filtrovan� p�ihl��ky | `capacity.spec.ts`           | ?   |
| Organiz�tor vid� p�ihl��ku v seznamu a zap��e platbu                                    | `payments.spec.ts`           | ?   |
| Organiz�tor odhl�s� ��astn�ka z term�nu a zm�na se zap��e do z�znamu                    | `term-status.spec.ts`        | ?   |
| Organiz�tor otev�e po�adn�k term�nu a vid� n�hradn�ky v po�ad� p�ijet�                  | `waitlist.spec.ts`           | ?   |
| Organiz�tor sma�e akci bez p�ihl��ek; akci s p�ihl��kami smazat nejde                   | `delete-event.spec.ts`       | ?   |
| Organiz�tor zvol� re�im vyhodnocov�n� do prvn� p�ihl��ky; s p�ihl��kou je zam�en�       | `evaluation-mode.spec.ts`    | ?   |
| Organiz�tor nastav� za��tek storno podm�nek na obrazovce �irok� 360 px                  | `cancellation-start.spec.ts` | ?   |
| �astn�k po��d� o odhl��en� po za��tku storna  organiz�tor ��dost na 360 px zam�tne    | `change-request.spec.ts`     | ?   |
| �astn�k ode�le p�ihl��ku v ru�n�m re�imu  organiz�tor ji vid� ve front� K vyhodnocen� | `queue.spec.ts`              | ?   |
| N�v�t�vn�k: landing  katalog  organizace  akce  p�ihl��ka (i na mobilu)             | `catalog.spec.ts`            | ?   |
| Organiz�tor zav�e a dokon�� kr�tk�, dlouh� a formul��ov� dialog programu na desktopu a p�i 360 px | `program-dialog-layout.spec.ts` | ? |

Novou cestu p�idej do tabulky v tomt�� PR. Cesta mimo tabulku se domlouv� s tech leadem. Okrajov� stavy (chybn� heslo, pro�l� odkaz) do E2E nepat��, pokud nejsou sou��st� hlavn� cesty.

## Pravidla psan�

1. **Kr�tce.** Test do ~20 ��dk�. Kdy� je del�, testuje� moc v�c� najednou.
2. **Jako u�ivatel.** Hledej prvky tak, jak je vid� �lov�k: `getByRole`, `getByLabel`, `getByText`. ��dn� CSS t��dy, `nth-child` ani XPath. `data-testid` jen v�jime�n�, kdy� prvek nem� roli ani text.
3. **Anglick� texty.** Prohl��e� bا� v `en-GB`, tak�e lok�tory pou��vaj� anglick� texty z `locales/en`. Kdy� zm�n�� text v UI, oprav i test.
4. **��dn� �ek�n� natvrdo.** Nikdy `waitForTimeout`. `expect(...)` �ek� s�m.
5. **Testy na sob� nez�vis�.** Ka�d� za��n� s�m (`page.goto`), ��dn� po�ad� ani sd�len� stav mezi testy. Data, kter� test vytvo��, maj� unik�tn� hodnoty (nap�. e-mail s `Date.now()`).
6. **Data ze seedu.** Datab�ze `togena_e2e` se p�ed ka�d�m b�hem sma�e a znovu napln� seedem. �ty a odkazy jsou v `tests/support/accounts.ts`. Seed m�� jen s v�dom�m, �e na n�m E2E stoj�.
7. **Opakovan� kroky do helperu.** P�ihl��en� a podobn� pat�� do `tests/support/`, ne kop�rovat do ka�d�ho testu.
8. **Mobil jen tam, kde na n�m z�le��.** Tag `@mobile` dost�vaj� jen cesty ��astn�ka. Ostatn� bا� jen na desktopu.
9. **��dn� `test.only`.** CI ho odm�tne. `test.fixme` jen pro domluvenou cestu z tabulky, kter� �ek� na story.

## Spu�t�n�

Postgres mus� bاet (`pnpm backend docker:up:wait`). P�i prvn�m spu�t�n� st�hni prohl��e�:

```bash
pnpm e2e browsers   # jednor�zov�: st�hne Chromium
pnpm e2e test       # sestav� a spust� backend (4190) + frontend (3190) a projede testy
pnpm e2e test:ui    # interaktivn�, krok po kroku
pnpm e2e report     # HTML report posledn�ho b�hu
```

E2E m� vlastn� porty a datab�zi, tak�e nevad� bا�c�mu `pnpm dev` ani worktree. Dva b�hy E2E nar�z ale nespou�t�j, sd�l� porty.

V CI bا� E2E jako samostatn� job `e2e` u ka�d�ho PR. Kdy� spadne, st�hni artefakt `playwright-report` (screenshot a trace kroku, kter� selhal).
