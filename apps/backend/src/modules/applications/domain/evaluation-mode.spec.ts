import { isEvaluationModeLocked } from "@/modules/applications/domain/evaluation-mode"

// D-083: the mode is locked by the first received application, nothing else.
describe("isEvaluationModeLocked", () => {
  it("stays open while the event has no application", () => {
    expect(isEvaluationModeLocked({ applicationCount: 0 })).toBe(false)
  })

  it("locks with the first received application", () => {
    expect(isEvaluationModeLocked({ applicationCount: 1 })).toBe(true)
    expect(isEvaluationModeLocked({ applicationCount: 25 })).toBe(true)
  })
})
