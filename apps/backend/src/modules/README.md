# Moduly

Jeden modul = jedna doménová oblast (akce, přihlášky, platby…). Modul vlastní svoje endpointy, logiku i přístup k datům a ostatní moduly používají jen to, co exportuje.

## Struktura

```
modules/<modul>/
  <modul>.module.ts          Nest modul: imports, controllers, providers, exports
  controllers/
    <věc>.controller.ts      HTTP vrstva — validace vstupu, guardy, mapování na DTO
    dto/
      create-<věc>.dto.ts    vstup (class-validator + @ApiProperty)
      <věc>.response.dto.ts  výstup se statickou fromDomain()
  services/
    <věc>.service.ts         aplikační logika a transakce
    <věc>.service.spec.ts    unit test s mockovaným repository
  repositories/
    <věc>.repository.ts      jediné místo, kde se sahá na Prismu; vrací doménové typy
  domain/
    <věc>.ts                 doménové typy (ne Prisma typy)
    <výpočet>.ts             čisté funkce bez DB a bez Nestu
    <výpočet>.spec.ts        unit testy výpočtů
```

## Pravidla

- **Controller** nic nepočítá. Ověří vstup (DTO), zavolá service a výsledek převede na response DTO.
- **Service** nezná Prismu. Pracuje s repository a doménovými typy.
- **Repository** převádí Prisma modely na doménové typy, aby se Prisma typy nedostaly ven z modulu.
- **Doménové výpočty** (kapacita, vyhodnocení, cena, dluh) jsou čisté funkce v `domain/` — testují se bez databáze a počítají se jen na jednom místě.
- **Autor / vlastník záznamu se bere ze session** (`@User() user: Identity`), nikdy z body požadavku.
- **Data organizace** se vždy filtrují podle `organizationId` a cizí záznam vrací 403 bez obsahu (US-10).
- Validace: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Každý endpoint má `@ApiTags`, `@ApiOperation` a `@ApiResponse`, aby Swagger (`/api/docs`) sloužil jako kontrakt pro frontend.
- Testy: `*.spec.ts` = unit (bez DB), `*.int-spec.ts` = integrační proti Postgresu.

Rozdělení modulů mezi proudy sprintu 1 je v [docs/PROJEKT.md](../../../../docs/PROJEKT.md#6-plán-práce-ve-sprintu-1).
