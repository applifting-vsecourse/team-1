# Předání e-mailů vývoji

Krok 5 plánu ([PLAN.md](PLAN.md)), zahájeno 5. 11. 2026. Podklady: schválený [katalog](KATALOG.md) (včetně sekce „Figma a místo v kódu“), [texty](TEXTY.md) a design ve Figmě (stránka „HF / 09 E-maily · nový design“). Dělení práce schválil Adam 5. 11. 2026. Tickety na GitHubu se nezakládají; úkoly se vedou v této větvi a v plánu. Technické řešení určuje vývoj, nepotvrzené business otázky neřeší odhadem.

## Vývojové úkoly

| # | Úkol | Rozsah | Hotovo, když | Návaznost |
| --- | --- | --- | --- | --- |
| 1 | Nový vzhled stávajících šablon | Všechny stávající šablony převést na schválený design (primární `#007f72`, Inter, DS komponenty) a texty z TEXTY.md, CS i EN. Aktualizovat komentáře `Figma:` na nové rámce. | Každá šablona odpovídá rámcům E01–E20 na desktopu i mobilu; test shody CS/EN projde. | Podklad: [#260](https://github.com/applifting-vsecourse/team-1/issues/260); ticket se neupravuje, nový design je ve Figmě na stránce „HF / 09 E-maily · nový design“ |
| 2 | Potvrzení náhradníka po uvolnění lůžka (APP_CONFIRMED, E05) | Odeslat e-mail při potvrzení náhradníka v obou režimech (ruční, automatické). Bez samostatné varianty textu, platební údaje jako u potvrzení účasti. | Po potvrzení náhradníka odejde jeden e-mail za přihlášku s platebními údaji. | Mezera ve vývoji, ne business otázka |
| 3 | Výzva k zaplacení (PAYMENT_OVERDUE, E14) | Jedna výzva po uplynutí lhůty, jen na požadavek organizátora, bez opakování. | Odejde nejvýše jednou na přihlášku; bez požadavku organizátora neodejde. | [#46](https://github.com/applifting-vsecourse/team-1/issues/46); automatické rušení po výzvě se nedělá (Q-PLA-03) |
| 4 | Potvrzení zaplacení (PAYMENT_SETTLED, E15) | Odeslat při přechodu na zaplacenou, jeden e-mail za přihlášku. | Doplacené termíny jsou ve zprávě společně, další platba se nepožaduje. | [#210](https://github.com/applifting-vsecourse/team-1/issues/210) |
| 5 | Oprava zaplacení (PAYMENT_CORRECTED, E16) | Nová šablona a odesílání při návratu z zaplacené k dluhu po opravě platby, jen dotčené termíny, s platebními údaji. Ne jako upomínka. | Po opravě platby odejde jeden e-mail; v kódu odlišný od E14. | [#205](https://github.com/applifting-vsecourse/team-1/issues/205); text a design E16 jsou v TEXTY.md a ve Figmě, do ticketu se nezapisují |
| 6 | Odhlášení účastníka a zrušení termínu (E11, E12) | Napojit odesílání na existující šablony; potvrzení odhlášení odejde i po odebrání termínu. | Obě události posílají jednu zprávu za přihlášku. | |
| 7 | Souhrn různých změn (E13) | Spojit současné různé změny téže přihlášky do jedné zprávy jen s dotčenými termíny. | Různé výsledky nemají zavádějící společný nadpis. | Dnes `TERMS_CHANGED` bez spouštěče |
| 8 | Úklid účtových e-mailů | Vyřadit `verify-email` (D-102); při založení účtu přihláškou jde magic link v E02. Kontakty v patičkách podle pravidla (organizátor × podpora). | Žádný obecný ověřovací e-mail neodchází; patičky odpovídají katalogu. | [#178](https://github.com/applifting-vsecourse/team-1/issues/178) |

Doporučené pořadí: 1, potom 2 až 5 a 6 až 8 nezávisle. Úkol 1 mění sdílené šablony, proto předchází ostatním, jinak by se nový obsah psal dvakrát.

## Scénáře pro business akceptaci (krok 6)

Vychází z [SYSTEM.md](SYSTEM.md), část „Business akceptace po vývoji“. Pro každou zprávu z katalogu ověřit správného příjemce, jazyk, počet zpráv (jedna za přihlášku), obsah, vzhled na mobilu a desktopu a případy, kdy e-mail neodchází.

## Otevřené

- Text a design E16 se vedou v TEXTY.md a ve Figmě; do #260 se nezapisují (rozhodnuto 5. 11. 2026).
- Q-PLA-03 (co po jediné výzvě bez reakce, priorita P3) předání neblokuje.
