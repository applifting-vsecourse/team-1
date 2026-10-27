import { HTTPError } from "ky"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

afterEach(() => vi.restoreAllMocks())

describe("notify", () => {
  it.each([
    ["success", 4000],
    ["info", 4000],
    ["warning", 8000],
    ["error", 8000],
  ] as const)("%s uses the matching sonner tone and a %i ms duration", (tone, duration) => {
    const spy = vi.spyOn(toast, tone).mockReturnValue("id")
    notify[tone]("Title", "Details")
    expect(spy).toHaveBeenCalledWith("Title", { description: "Details", duration })
  })

  it("shows the translated message of a known server error code, not the raw one", () => {
    const spy = vi.spyOn(toast, "error").mockReturnValue("id")
    const error = Object.assign(
      new HTTPError(new Response(null, { status: 403 }), new Request("http://x"), {} as never),
      {
        code: "FORBIDDEN",
        message: "raw server text",
      },
    )
    notify.serverError("Could not delete", error)
    const options = spy.mock.calls[0]?.[1]
    expect(options?.description).toBeTypeOf("string")
    expect(options?.description).not.toBe("raw server text")
  })

  it("leaves the description out for an unknown error", () => {
    const spy = vi.spyOn(toast, "error").mockReturnValue("id")
    notify.serverError("Could not delete", new Error("boom"))
    expect(spy).toHaveBeenCalledWith("Could not delete", { description: undefined, duration: 8000 })
  })
})
