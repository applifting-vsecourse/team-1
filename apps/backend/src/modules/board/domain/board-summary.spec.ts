import { excerpt, newPostCounts, summarize } from "./board-summary"

describe("excerpt", () => {
  it("keeps a short text and joins its lines", () => {
    expect(excerpt("Sraz v 9:00\n\nu nádraží")).toBe("Sraz v 9:00 u nádraží")
  })

  it("cuts a long text with an ellipsis", () => {
    const result = excerpt("slovo ".repeat(50), 20)
    expect(result.endsWith("…")).toBe(true)
    expect(result.length).toBeLessThanOrEqual(21)
  })
})

describe("summarize", () => {
  it("counts the new posts and names the newest", () => {
    expect(
      summarize([
        { id: "p3", title: "Třetí", isNew: true },
        { id: "p2", title: "Druhý", isNew: false },
        { id: "p1", title: "První", isNew: true },
      ]),
    ).toEqual({
      unreadCount: 2,
      latest: { id: "p3", title: "Třetí" },
      unreadByApplication: [],
    })
  })

  it("has no newest post on an empty board", () => {
    expect(summarize([])).toEqual({ unreadCount: 0, latest: null, unreadByApplication: [] })
  })
})

describe("newPostCounts", () => {
  const row = (
    applicationId: string,
    termId: string,
    status: "CONFIRMED" | "WAITLISTED" | "TO_EVALUATE" | "CANCELLED",
    termCancelled = false,
  ) => ({ applicationId, termId, status, termCancelled })

  it("counts the new posts of the terms each application is confirmed or a substitute in", () => {
    const posts = [
      { termIds: ["t1"], isNew: true },
      { termIds: ["t2"], isNew: true },
      { termIds: ["t1", "t2"], isNew: false },
    ]
    expect(
      newPostCounts(
        [row("a1", "t1", "CONFIRMED"), row("a1", "t2", "WAITLISTED"), row("a2", "t2", "CONFIRMED")],
        posts,
      ),
    ).toEqual([
      { applicationId: "a1", unreadCount: 2 },
      { applicationId: "a2", unreadCount: 1 },
    ])
  })

  it("leaves out an application to evaluate, a cancelled one and one in a cancelled term", () => {
    const posts = [{ termIds: ["t1"], isNew: true }]
    expect(
      newPostCounts(
        [
          row("a1", "t1", "TO_EVALUATE"),
          row("a2", "t1", "CANCELLED"),
          row("a3", "t1", "CONFIRMED", true),
        ],
        posts,
      ),
    ).toEqual([])
  })

  it("counts a post once for an application with the post in two of its terms", () => {
    expect(
      newPostCounts(
        [row("a1", "t1", "CONFIRMED"), row("a1", "t2", "CONFIRMED")],
        [{ termIds: ["t1", "t2"], isNew: true }],
      ),
    ).toEqual([{ applicationId: "a1", unreadCount: 1 }])
  })
})
