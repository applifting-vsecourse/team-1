import { isEvaluationModeLocked } from "@/modules/applications/domain/evaluation-mode"

describe("isEvaluationModeLocked", () => {
  it("stays open while the application link does not work yet", () => {
    expect(isEvaluationModeLocked({ termCount: 0, roomCount: 0, applicationCount: 0 })).toBe(false)
    expect(isEvaluationModeLocked({ termCount: 2, roomCount: 0, applicationCount: 0 })).toBe(false)
    expect(isEvaluationModeLocked({ termCount: 0, roomCount: 3, applicationCount: 0 })).toBe(false)
  })

  it("locks once the application link works", () => {
    expect(isEvaluationModeLocked({ termCount: 1, roomCount: 1, applicationCount: 0 })).toBe(true)
  })

  it("stays locked when applications exist although the setup was reduced", () => {
    expect(isEvaluationModeLocked({ termCount: 0, roomCount: 0, applicationCount: 1 })).toBe(true)
  })
})
