Refs #

## Co se mění

<!-- 1–3 věty. Název PR = název story, např. „US-23 Přihláška přes odkaz“. -->

## Jak ověřit

<!-- Kroky pro reviewera / product managera: kam kliknout, s jakým seed účtem, co má být vidět. -->

## Checklist

- [ ] Akceptační kritéria story jsou splněná (nebo je níže napsané, co chybí a proč)
- [ ] Logika má testy, `pnpm check-all` je zelený
- [ ] UI odpovídá [DESIGN.md](../DESIGN.md) — žádné vnořené karty, tři stavy seznamu, texty česky
- [ ] Nejvýš jedna migrace, rebasnutá na aktuální `main`
- [ ] Mění se sdílené soubory (`schema.prisma`, `app.module.ts`, `routes.ts`, `components/**`)? Pak je to napsané tady:
- [ ] Review od člena týmu (doporučené, u schématu, auth a doménové logiky zvlášť)
