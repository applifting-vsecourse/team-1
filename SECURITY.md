# Bezpečnost

## Nahlášení zranitelnosti

Zranitelnost nehlaste ve veřejném issue. Použijte [soukromé nahlášení](https://github.com/applifting-vsecourse/team-1/security/advisories/new) (záložka **Security → Report a vulnerability**).

Podporovaná je jen aktuální verze z větve `main`, která běží na stagingu.

## Co hlídáme automaticky

| Co                                                                      | Kdy                             | Co udělá                                                                                                                |
| ----------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Dependabot security updates                                             | hned po zveřejnění chyby        | Otevře PR s opravou. Opravy z jednoho běhu jsou v jednom PR `chore(deps): bump the security group …`.                   |
| Dependabot version updates ([`dependabot.yml`](.github/dependabot.yml)) | každé pondělí 6:00              | Seskupené PR: npm produkční, npm vývojové, Docker, Docker Compose, GitHub Actions. Major verze zvlášť.                  |
| [`dependency-review.yml`](.github/workflows/dependency-review.yml)      | každý PR se závislostmi         | Selže, když PR přidá závislost s vysokou nebo kritickou chybou. Staré nálezy z `main` PR neblokují.                     |
| [`security-audit.yml`](.github/workflows/security-audit.yml)            | denně 5:00 UTC                  | Spočítá nálezy `pnpm audit` do souhrnu běhu, selže při kritickém nálezu v produkčních závislostech.                     |
| Secret scanning a push protection                                       | při každém pushi                | Zablokuje push s tokenem nebo heslem a upozorní na už uniklé.                                                           |
| CodeQL (code scanning, default setup)                                   | každý PR, push do `main`, týdně | Hledá bezpečnostní chyby ve vlastním kódu a workflow (injection, XSS, práva tokenu). Nálezy v Security → Code scanning. |

Nová verze se v PR objeví až po několika dnech od vydání (`cooldown` v `dependabot.yml`). Kompromitované balíčky bývají do té doby stažené. Bezpečnostní opravy čekání nemají.

## Co s PR od Dependabota

- **Bezpečnostní PR** má přednost před prací na story. Když je CI zelené, sloučí ho kdokoli z týmu. Když CI padá, opraví ho ten, kdo PR převezme, ve stejné větvi.
- **Seskupené minor a patch PR** se slučují při zeleném CI, nejpozději do dalšího pondělí, aby se nehromadily.
- **Major verze** projde člověk: changelog, případné úpravy kódu. Když se teď dělat nemá, PR zavřete komentářem `@dependabot ignore this major version`.
- Před demem se PR od Dependabota neslučují, kromě kritických bezpečnostních oprav (CLAUDE.md, „Stay in the story's scope“).

PR od Dependabota nedostávají komentář „Co se změnilo“, protože Dependabot dostane token jen pro čtení. CI, E2E, dependency review a CodeQL běží normálně.

## Nastavení repozitáře

Všechno je zapnuté v [Settings → Advanced Security](https://github.com/applifting-vsecourse/team-1/settings/security_analysis). Bez prvních čtyř Dependabot nic nehlásí ani neotevírá:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Grouped security updates
- Secret scanning a push protection
- Private vulnerability reporting
- Code scanning (CodeQL, default setup)

Aktuální stav nálezů a navržené opravy: [`docs/SECURITY-REPORT.md`](docs/SECURITY-REPORT.md).
