import { excerpt, summarize } from "./board-summary"

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
    ).toEqual({ unreadCount: 2, latest: { id: "p3", title: "Třetí" } })
  })

  it("has no newest post on an empty board", () => {
    expect(summarize([])).toEqual({ unreadCount: 0, latest: null })
  })
})
