---
paths:
  - "apps/e2e/**"
  - "docs/E2E.md"
---

## E2E tests

Only the core journeys listed in [`docs/E2E.md`](../../docs/E2E.md) get an E2E test (`apps/e2e`); everything else is a unit, API (`*.int-spec.ts`) or component test. When a story completes a journey from that list, add or enable its test in the same PR. Locators by role / label / text, English copy, no `waitForTimeout`, every test independent of the others.
