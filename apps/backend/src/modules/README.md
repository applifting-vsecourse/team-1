# Moduly

Jeden modul = jedna doménová oblast (akce, přihlášky, platby…). Modul vlastní svoje endpointy, logiku i přístup k datům a ostatní moduly používají jen to, co exportuje.

Vzorový modul se všemi vrstvami: [`account/`](account) (`GET /api/me`).

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
- **Ochrana endpointu:** `@Auth('ORGANIZER')` na controlleru (bez session 401, jiný typ účtu 403). `@Auth()` pustí kohokoliv přihlášeného. Veřejné endpointy (přihláška) dekorátor nemají.
- **Data organizace** se vždy filtrují podle `organizationId` a cizí záznam vrací 403 bez obsahu (US-10). Nepiš kontrolu sám, použij `OrganizationAccessService` z `shared/organization-access`:
  ```ts
  const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId);
  // seznamy: where: { organizationId: { in: await this.organizationAccess.getOrganizationIds(user) } }
  ```
- **Chyby:** `throw new AppException(HttpStatus.CONFLICT, 'EMAIL_TAKEN_BY_ORGANIZER')` s kódem z `shared/errors/error-code.ts`. Odpověď je vždy `{ statusCode, code, message }` a frontend kód přeloží — nový kód přidej i do `apps/frontend/src/i18n/locales/{en,cs}/errors.json`.
- **Jazyk:** `@RequestLocale() locale: Locale` vrátí jazyk UI z `Accept-Language`. Ulož ho k přihlášce, e-maily se pak posílají v něm.
- **Výpočty kapacity, stavu a ceny** jsou jen v `modules/applications/domain` (`capacity.ts`, `evaluation.ts`, `pricing.ts`). Nepočítej je znovu jinde.
- Validace: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Každý endpoint má `@ApiTags`, `@ApiOperation` a `@ApiResponse`, aby Swagger (`/api/docs`) sloužil jako kontrakt pro frontend.
- Testy: `*.spec.ts` = unit (bez DB), `*.int-spec.ts` = integrační proti Postgresu.

Rozdělení modulů mezi proudy sprintu 1 je v [docs/PROJEKT.md](../../../../docs/PROJEKT.md#6-plán-práce-ve-sprintu-1).
