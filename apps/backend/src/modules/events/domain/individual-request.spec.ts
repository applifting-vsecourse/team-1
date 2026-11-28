import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { INDIVIDUAL_REQUEST_EXCLUDED_STATUSES } from "./individual-request"

describe("INDIVIDUAL_REQUEST_EXCLUDED_STATUSES", () => {
  it("leaves out cancelled and archived applications only", () => {
    expect([...INDIVIDUAL_REQUEST_EXCLUDED_STATUSES].sort()).toEqual(["ARCHIVED", "CANCELLED"])
  })

  it("keeps the requests of applications still taking part in the term", () => {
    const taking: ApplicationTermStatus[] = ["TO_EVALUATE", "CONFIRMED", "WAITLISTED"]
    for (const status of taking) {
      expect(INDIVIDUAL_REQUEST_EXCLUDED_STATUSES).not.toContain(status)
    }
  })
})
