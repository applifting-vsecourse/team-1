// Runs from the repo root so both apps are covered — a backend file that
// skipped formatting used to pass the hook and then fail CI.
// Prettier for app files runs inside the app (`pnpm --filter … exec`), exactly
// like the app's `format:check` in CI: the root .prettierignore ignores `apps`,
// so a root-level `prettier --write` silently skipped every app file.
// Globs run in parallel, so each file gets exactly one glob and its commands
// run in order.
export default {
  'apps/frontend/src/**/*.{ts,tsx,js,cjs,mjs}': [
    'pnpm --filter frontend exec prettier --write',
    'pnpm --filter frontend exec eslint --fix',
  ],
  'apps/frontend/src/**/*.{css,json}': [
    'pnpm --filter frontend exec prettier --write',
  ],
  'apps/backend/src/**/*.ts': [
    'pnpm --filter backend exec prettier --write',
    'pnpm --filter backend exec eslint --fix',
  ],
  // App files match here too, but the root .prettierignore skips them.
  '*.{json,md,yaml,yml}': ['prettier --write'],
};
