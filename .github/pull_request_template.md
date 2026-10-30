Closes #

## Co se mění

<!-- 1–3 věty. Název PR = název story, např. „US-23 Přihláška přes odkaz“. -->

## Jak ověřit

<!-- Kroky pro reviewera / product managera: kam kliknout, s jakým seed účtem, co má být vidět. -->

## Checklist

- [ ] Jeden PR na story (BE + FE + testy); je-li větší než cca 400 řádků kódu / 20 souborů, je níže napsáno proč
- [ ] Akceptační kritéria story jsou splněná a odškrtnutá v issue (nebo je níže napsané, co chybí a proč)
- [ ] Story dokončuje cestu z [docs/E2E.md](../docs/E2E.md)? Pak je v PR E2E test, jinak je napsáno „žádná cesta z E2E.md se nemění“
- [ ] Nejasnosti k byznys pravidlům jsou napsané níže jako „Dotaz na Adama“ (nebo žádné nejsou)
- [ ] Logika má testy, `pnpm check-all` je zelený
- [ ] UI odpovídá [DESIGN.md](../DESIGN.md) — žádné vnořené karty, tři stavy seznamu
- [ ] Žádné texty napevno — nové klíče v `en` i `cs` (i18n), chyby API mají `code`
- [ ] Nejvýš jedna migrace, rebasnutá na aktuální `main`
- [ ] Mění se sdílené soubory (`schema.prisma`, `app.module.ts`, `routes.ts`, `components/**`)? Pak je to napsané tady:
- [ ] Review od člena týmu (doporučené, u schématu, auth a doménové logiky zvlášť)
