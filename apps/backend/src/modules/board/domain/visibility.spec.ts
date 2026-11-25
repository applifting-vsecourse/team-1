import { canSeePost, pickRecipients, ViewerTerm, visibleTermIds } from "./visibility"

const term = (patch: Partial<ViewerTerm> = {}): ViewerTerm => ({
  termId: "t1",
  status: "CONFIRMED",
  termCancelled: false,
  ...patch,
})

describe("board visibility", () => {
  it.each(["CONFIRMED", "WAITLISTED"] as const)("an application %s sees the post", (status) => {
    expect(canSeePost([term({ status })], ["t1"])).toBe(true)
  })

  it.each(["TO_EVALUATE", "CANCELLED", "ARCHIVED"] as const)(
    "an application %s sees nothing",
    (status) => {
      expect(canSeePost([term({ status })], ["t1"])).toBe(false)
    },
  )

  it("a cancelled term shows nothing", () => {
    expect(canSeePost([term({ termCancelled: true })], ["t1"])).toBe(false)
  })

  it("a post of another term is not seen", () => {
    expect(canSeePost([term()], ["t2"])).toBe(false)
  })

  it("one visible term of several is enough", () => {
    const terms = [term({ termId: "t1", status: "CANCELLED" }), term({ termId: "t2" })]
    expect(canSeePost(terms, ["t1", "t2"])).toBe(true)
    expect([...visibleTermIds(terms)]).toEqual(["t2"])
  })
})

describe("pickRecipients", () => {
  const row = (userId: string | null, applicationId: string, day: number, status = "CONFIRMED") =>
    ({
      userId,
      applicationId,
      applicationCreatedAt: new Date(`2026-11-${String(day).padStart(2, "0")}`),
      status,
    }) as Parameters<typeof pickRecipients>[0][number]

  it("tells an account once, with its newest application", () => {
    expect(pickRecipients([row("u1", "a1", 1), row("u1", "a2", 5), row("u1", "a3", 3)])).toEqual([
      { userId: "u1", applicationId: "a2" },
    ])
  })

  it("skips applications without an account and the ones that see nothing", () => {
    expect(
      pickRecipients([
        row(null, "a1", 1),
        row("u2", "a2", 1, "TO_EVALUATE"),
        row("u3", "a3", 1, "CANCELLED"),
        row("u4", "a4", 1, "WAITLISTED"),
      ]),
    ).toEqual([{ userId: "u4", applicationId: "a4" }])
  })
})
