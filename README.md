# kemp.io

Platforma pro přihlášky na vícetermínové akce — letní kempy, soustředění, tábory, firemní výjezdy.

Organizátor založí akci s termíny, cenami a pokoji a rozešle odkaz. Zájemce se přihlásí z mobilu bez registrace. Systém každý termín vyhodnotí podle volných lůžek v dámských a pánských pokojích a přihlášku potvrdí, nebo zařadí mezi náhradníky. Účastník hned vidí, kolik a kam zaplatit, a organizátor má na jednom místě obsazenost, přihlášky i platby.

Školní týmový projekt předmětu [4IT580](https://4it580.vse.cz) na VŠE (tým 1).

## Odkazy

- **Zkušební prostředí:** https://team-1.vsepractical.applifting.dev (nasazuje se automaticky z `main`)
- **Board:** https://github.com/orgs/applifting-vsecourse/projects/12
- **Projektový dokument** (rozsah, rozhodnutí, architektura): [docs/PROJEKT.md](docs/PROJEKT.md)
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

## Tým

**Technical lead:** [kudrle01](https://github.com/kudrle01)

| Member                                            | Role            |
| ------------------------------------------------- | --------------- |
| [Jakubkuba9000](https://github.com/Jakubkuba9000) | Designer        |
| [Aadikk](https://github.com/Aadikk)               | Product manager |
| [PJjiry](https://github.com/PJjiry)               | Tester          |

**Product owner:** [tomaskriz-max](https://github.com/tomaskriz-max) — the client for whom the product is built; not a member of the team.

## Licence

[MIT](LICENSE.txt). Projekt vychází ze startovací šablony kurzu 4IT580 od Applifting.
