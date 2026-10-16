// No `@/` imports here: Jest's globalSetup runs outside moduleNameMapper.

/**
 * Integration tests run against their own database so they can wipe it freely.
 * TEST_DATABASE_URL wins; otherwise it is DATABASE_URL with `_test` appended
 * to the database name (kemp → kemp_test). Never the development database.
 */
export function resolveTestDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;

  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      'Set DATABASE_URL (apps/backend/.env) or TEST_DATABASE_URL to run integration tests.',
    );
  }
  const url = new URL(base);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}
