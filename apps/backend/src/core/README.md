# Core

Infrastruktura, která nezná doménu Togeny a fungovala by v jakékoli aplikaci: připojení k databázi (`prisma/`) a odesílání e-mailů (`email/`).

Pokud kód ví něco o akcích, přihláškách nebo rolích, nepatří sem. Patří do `shared/` (průřezové věci této aplikace) nebo do `modules/`.

E-mailové šablony (`email/templates/`) se dají prohlížet přes `pnpm backend email:dev`.
