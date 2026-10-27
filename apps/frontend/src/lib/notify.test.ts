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
})
