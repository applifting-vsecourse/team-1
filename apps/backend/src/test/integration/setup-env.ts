// Runs in every integration test file before it is loaded: point the app at
// the test database. No `@/` imports (see test-database-url.ts).
import { resolve } from "node:path"
import * as dotenv from "dotenv"
import { resolveTestDatabaseUrl } from "./test-database-url"

dotenv.config({ path: resolve(__dirname, "../../../.env"), quiet: true })
process.env.DATABASE_URL = resolveTestDatabaseUrl()
