import { z } from "zod"

// The CSP (apps/frontend/nginx-security-headers.conf) forbids eval. Without
// this, zod probes `Function("")` before its first parse and the browser logs
// a CSP violation. Imported first in main.tsx, before any schema runs.
z.config({ jitless: true })
