import { ConsoleMailerAdapter, extractLinks } from "./console-mailer-adapter"

describe("extractLinks", () => {
  it("returns each link once, in order", () => {
    const html =
      '<a href="http://localhost:3050/participant/magic-link?token=abc">Open</a><p>http://x</p><a href="http://localhost:3050/participant/magic-link?token=abc">again</a><a href="https://example.com/b">b</a>'

    expect(extractLinks(html)).toEqual([
      "http://localhost:3050/participant/magic-link?token=abc",
      "https://example.com/b",
    ])
  })

  it("decodes ampersands of query strings", () => {
    expect(extractLinks('<a href="http://x/?a=1&amp;b=2">x</a>')).toEqual(["http://x/?a=1&b=2"])
  })

  it("finds nothing in an e-mail without links", () => {
    expect(extractLinks("<p>Hello</p>")).toEqual([])
  })
})

describe("ConsoleMailerAdapter", () => {
  it("prints recipient, subject and links — not the HTML", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined)

    await new ConsoleMailerAdapter().sendEmail(
      "ucastnik@example.com",
      "Your link",
      '<html><body><a href="http://localhost:3050/participant/magic-link?token=abc">Open</a></body></html>',
    )

    const output = String(log.mock.calls[0][0])
    expect(output).toContain("To: ucastnik@example.com")
    expect(output).toContain("Subject: Your link")
    expect(output).toContain("Link: http://localhost:3050/participant/magic-link?token=abc")
    expect(output).not.toContain("<html>")
    log.mockRestore()
  })
})
