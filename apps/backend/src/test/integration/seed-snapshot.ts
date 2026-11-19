// A copy of the seeded test database, so a test file gets a fresh seed in
// ~0.1 s instead of running the seed script (~3 s) every time.
// No `@/` imports: global-setup.ts uses this too (see test-database-url.ts).

/** The part of a Prisma client this file needs; PrismaService and PrismaClient both fit. */
type SqlClient = { $executeRawUnsafe(query: string): Promise<number> }

/** The tables the seed starts from; it empties them (and everything referencing them) first. */
const ROOT_TABLES = `'organization', 'session', 'account', 'verification', 'user'`

/**
 * Copies every table the seed fills (the root tables and all tables that
 * reference them, the same set `TRUNCATE … CASCADE` empties) into the schema
 * `seed_snapshot`, and creates `seed_snapshot.restore()`. Run once after the seed.
 */
export async function takeSeedSnapshot(client: SqlClient): Promise<void> {
  await client.$executeRawUnsafe(`DROP SCHEMA IF EXISTS seed_snapshot CASCADE`)
  await client.$executeRawUnsafe(`CREATE SCHEMA seed_snapshot`)
  await client.$executeRawUnsafe(`
    DO $$
    DECLARE t text;
    BEGIN
      FOR t IN
        WITH RECURSIVE seeded(oid) AS (
          SELECT c.oid FROM pg_class c
          WHERE c.relnamespace = 'public'::regnamespace AND c.relname IN (${ROOT_TABLES})
          UNION
          SELECT con.conrelid FROM pg_constraint con JOIN seeded ON con.confrelid = seeded.oid
          WHERE con.contype = 'f'
        )
        SELECT c.relname FROM pg_class c JOIN seeded ON seeded.oid = c.oid
      LOOP
        EXECUTE format('CREATE TABLE seed_snapshot.%I AS TABLE public.%I', t, t);
      END LOOP;
    END $$`)
  await client.$executeRawUnsafe(`
    CREATE FUNCTION seed_snapshot.restore() RETURNS void LANGUAGE plpgsql AS $$
    DECLARE t text; s record;
    BEGIN
      -- Foreign keys are triggers; replica mode skips them so the tables can be
      -- filled in any order. Only for this transaction.
      PERFORM set_config('session_replication_role', 'replica', true);
      TRUNCATE TABLE "organization", "session", "account", "verification", "user" RESTART IDENTITY CASCADE;
      FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'seed_snapshot' LOOP
        EXECUTE format('INSERT INTO public.%I SELECT * FROM seed_snapshot.%I', t, t);
      END LOOP;
      -- Sequences (Application.number) continue after the copied rows, as after the seed.
      FOR s IN
        SELECT c.table_name, c.column_name,
               pg_get_serial_sequence(format('public.%I', c.table_name), c.column_name) AS seq
        FROM information_schema.columns c
        JOIN pg_tables st ON st.schemaname = 'seed_snapshot' AND st.tablename = c.table_name
        WHERE c.table_schema = 'public'
      LOOP
        IF s.seq IS NOT NULL THEN
          EXECUTE format('SELECT setval(%L, COALESCE((SELECT max(%I) FROM public.%I), 0) + 1, false)',
                         s.seq, s.column_name, s.table_name);
        END IF;
      END LOOP;
    END $$`)
}

/** Puts the test database back to the state right after the seed. */
export async function restoreSeedSnapshot(client: SqlClient): Promise<void> {
  await client.$executeRawUnsafe(`SELECT seed_snapshot.restore()`)
}
