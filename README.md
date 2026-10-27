# Togena

Platforma pro přihlášky na vícetermínové akce — letní kempy, soustředění, tábory, firemní výjezdy.

Organizátor založí akci s termíny, cenami a pokoji a rozešle odkaz. Zájemce se přihlásí z mobilu bez registrace. Systém každý termín vyhodnotí podle volných lůžek v dámských a pánských pokojích a přihlášku potvrdí, nebo zařadí mezi náhradníky. Účastník hned vidí, kolik a kam zaplatit, a organizátor má na jednom místě obsazenost, přihlášky i platby.

Školní týmový projekt předmětu [4IT580](https://4it580.vse.cz) na VŠE (tým 1).

## Odkazy

- **Zkušební prostředí:** https://team-1.vsepractical.applifting.dev (nasazuje se automaticky z `main`)
- **Board:** https://github.com/orgs/applifting-vsecourse/projects/12
- **Projektový dokument** (rozsah, rozhodnutí, architektura): [docs/PROJEKT.md](docs/PROJEKT.md)
- **Slovník pojmů** business domény: [docs/SLOVNIK.md](docs/SLOVNIK.md)
- **Pravidla UI a designu:** [DESIGN.md](DESIGN.md)
- **Jak přispívat** (postup, příkazy, řešení problémů): [CONTRIBUTING.md](CONTRIBUTING.md)

## Stack

React + Vite + TanStack Router/Query + Tailwind/shadcn · NestJS + Prisma + PostgreSQL + BetterAuth · pnpm monorepo (`apps/frontend`, `apps/backend`).

## Spuštění

Potřebuješ Node.js 24 ([`.nvmrc`](.nvmrc)), pnpm (`corepack enable`) a Docker.

```shell
pnpm install
pnpm dev
```

Frontend běží na http://localhost:3050, API na http://localhost:4050/api a Swagger na http://localhost:4050/api/docs.

## Pravidla spolupráce

- **Board určuje rozsah práce**, [projektový dokument](docs/PROJEKT.md) rozhodnutí a pravidla. Rozpory řeš podle něj, dokud tým nebo PO rozhodnutí nezmění.
- **Jedna story = jedna větev = jeden PR**, včetně backendu, frontendu a testů.
- Do `main` mergujeme přes PR, **se zeleným CI a po otestování testerem**, pomocí squash merge. Issue zavírá product manager po ověření na stagingu; v PR používej `Refs #číslo`.
- Issues a dokumentaci píšeme **česky**, kód a commity **anglicky**. Doménové názvy držíme podle [slovníku](docs/SLOVNIK.md).

Podrobný postup a Definition of Done jsou v [CONTRIBUTING.md](CONTRIBUTING.md).

## Tým

**Klient:** [tomaskriz-max](https://github.com/tomaskriz-max) — vlastník produktu, pro kterého Togenu stavíme; není členem týmu.

| Člen                                              | Role            |
| ------------------------------------------------- | --------------- |
| [kudrle01](https://github.com/kudrle01)           | Technical lead  |
| [Jakubkuba9000](https://github.com/Jakubkuba9000) | Designer        |
| [Aadikk](https://github.com/Aadikk)               | Product manager |
| [PJjiry](https://github.com/PJjiry)               | Tester          |

## Licence

[MIT](LICENSE.txt). Projekt vychází ze startovací šablony kurzu 4IT580 od Applifting.
