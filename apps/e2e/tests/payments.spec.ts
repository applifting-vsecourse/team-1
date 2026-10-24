import { test } from "@playwright/test"

// Core journey from docs/E2E.md; enable when US-52 (application list, PR #150) is merged. US-44 (payments) already is.
test.describe("Payments", () => {
  test.fixme("organizer sees an application in the list and records a payment", async () => {})
})
