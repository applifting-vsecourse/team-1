# E-maily přihlašovateli

Kdy se v procesu přihlášky v termínu odesílá e-mail a jakého typu. Vychází z procesních a stavových diagramů [ručního](rucni-vyhodnocovani/) a [automatického](automaticke-vyhodnocovani/) vyhodnocování.

> **Pozor, konflikt s dosavadním stavem:** tento dokument počítá s tím, že se účastník dozví, že je náhradník („Jste náhradník“, pořadí se nesděluje). Dosud platí opak: `docs/FIGMA-REMAKE.md` (řádek 71) a šablona `application-confirmation-waitlisted` i rozhraní účastníka ukazují náhradníka jako „Čeká na potvrzení“. Platí tento dokument, ty tři místa je potřeba upravit.

Sloupec **Typ** říká, jestli e-mail v kódu už existuje (šablona v `core/email/templates`), nebo je to návrh nového typu. Sloupce **Ruční** a **Auto** říkají, ve kterém režimu e-mail platí.

| #   | Co se stane (přechod)                                                   | Ruční | Auto | E-mail                                                                                                                                                                                                                              | Typ                           |
| --- | ----------------------------------------------------------------------- | ----- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Přihláška zaregistrována (odeslání formuláře)                           | ano   | ano  | Souhrnný potvrzovací e-mail, jeden za celé odeslání. Ruční: termíny ve stavu „Čeká na vyhodnocení“, bez platebních údajů. Auto: rovnou výsledek vyhodnocení (potvrzeno, nebo jste náhradník), platební údaje u potvrzených termínů. | existující                    |
| 2   | K vyhodnocení → Potvrzená s dluhem (organizátor potvrdí)                | ano   | ne   | Změna přihlášky: potvrzeno, s platebními údaji (částka, účet, VS)                                                                                                                                                                   | existující (`STATUS_CHANGED`) |
| 3   | K vyhodnocení → Náhradník (organizátor zařadí)                          | ano   | ne   | Změna přihlášky: jste náhradník (pořadí se nesděluje)                                                                                                                                                                               | nový druh změny (náhradník)   |
| 4   | K vyhodnocení → Zrušená (organizátor zamítne)                           | ano   | ne   | Změna přihlášky: zamítnuto                                                                                                                                                                                                          | nový druh změny (zamítnutí)   |
| 5   | Náhradník → Potvrzená s dluhem (uvolní se lůžko)                        | ano   | ano  | Změna přihlášky: potvrzeno, s platebními údaji. Ruční potvrdí organizátor, auto systém.                                                                                                                                             | existující (`STATUS_CHANGED`) |
| 6   | Náhradník → Zrušená (nastal první den termínu akce)                     | ano   | ano  | Změna přihlášky: zrušeno, protože se neuvolnilo lůžko                                                                                                                                                                               | nový důvod změny              |
| 7   | Potvrzená s dluhem: lhůta pro zaplacení dluhu uplynula                  | ano   | ano  | Výzva k zaplacení (částka, účet, VS)                                                                                                                                                                                                | nový typ                      |
| 8   | Potvrzená s dluhem → Potvrzená a zaplacená (Σ plateb = částka k úhradě) | ano   | ano  | Potvrzení přijetí platby                                                                                                                                                                                                            | nový typ                      |
| 9   | Potvrzená s dluhem → Zrušená (okolnosti pro zamítnutí, i po výzvě)      | ano   | ano  | Změna přihlášky: zamítnuto                                                                                                                                                                                                          | nový druh změny (zamítnutí)   |
| 10  | Potvrzená a zaplacená → Zrušená (okolnosti pro zamítnutí)               | ano   | ano  | Změna přihlášky: zamítnuto                                                                                                                                                                                                          | nový druh změny (zamítnutí)   |
| 11  | Potvrzená a zaplacená → Zrušená (účastník se odhlásí)                   | ano   | ano  | Změna přihlášky: odhlášeno (potvrzení odhlášení)                                                                                                                                                                                    | existující (`CANCELLED`)      |
| 12  | Potvrzená a zaplacená → Archivovaná (termín proběhl)                    | ano   | ano  | žádný                                                                                                                                                                                                                               | –                             |

Kroky organizátora (nastavení režimu a pokojů, spuštění přihlášek) žádný e-mail účastníkovi nevyvolávají. Odkaz na přihlášení a první heslo jsou součástí e-mailu č. 1, mimo tyto diagramy.

## Cesta účastníka

Účastník se musí dozvědět každý výsledek, aby cesta byla úplná: zaregistruje se, ví, že se s přihláškou pracuje, a pak dostane výsledek.

| Stav přihlášky v termínu | Co se účastníkovi sdělí                              | Platí v režimu |
| ------------------------ | ---------------------------------------------------- | -------------- |
| K vyhodnocení            | Čeká na vyhodnocení.                                 | ruční          |
| Potvrzená s dluhem       | Potvrzeno, počítáme s vámi, platební údaje.          | ruční, auto    |
| Náhradník                | Jste náhradník.                                      | ruční, auto    |
| Zrušená                  | Zrušeno (zamítnuto, odhlášeno nebo nezískáno lůžko). | ruční, auto    |
| Potvrzená a zaplacená    | Platba přijata.                                      | ruční, auto    |
| Archivovaná              | nic (termín proběhl)                                 | ruční, auto    |

Pořadí náhradníků se účastníkovi nesděluje.

## Pravidla

- E-mail č. 1 je jeden za celé odeslání formuláře, i když je v něm víc účastníků. E-maily č. 2 až 11 jdou za jednu přihlášku, ne za každý termín: když se najednou změní víc termínů téže přihlášky, odejde jeden e-mail.
- Platební údaje (částka, účet, VS) jsou jen v e-mailech, kde přihláška vznikla nebo se stala potvrzenou (č. 1 v auto režimu, č. 2, č. 5) a ve výzvě (č. 7). Ve zrušených přihláškách nejsou.
- E-maily jdou v jazyce přihlášky (`Application.locale`).
- Samostatný e-mail s magic linkem (formulář „pošlete mi odkaz“, mimo tabulku výše) jde v jazyce UI v okamžiku žádosti, ne v jazyce přihlášky ani účtu. Když jazyk chybí, platí `en`. Magic link vložený do e-mailu č. 1 jde v jazyce přihlášky s tím e-mailem.
