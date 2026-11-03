import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  readApplicationsSearch,
  saveApplicationsSearch,
} from "@/features/event-overview/lib/applications-search-session"

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe("applications search session", () => {
  it("stores every filter separately for each event", () => {
    const filters = {
      q: "Jana",
      term: "t1",
      status: "WAITLISTED",
      gender: "FEMALE",
      payment: "UNPAID",
    } as const
    saveApplicationsSearch("e1", filters)
    saveApplicationsSearch("e2", { payment: "PAID" })
    expect(readApplicationsSearch("e1")).toEqual(filters)
    expect(readApplicationsSearch("e2")).toEqual({ payment: "PAID" })
    expect(readApplicationsSearch("e3")).toEqual({})
  })

  it("replaces stored filters when they are cleared", () => {
    saveApplicationsSearch("e1", { payment: "UNPAID" })
    saveApplicationsSearch("e1", {})
    expect(readApplicationsSearch("e1")).toEqual({})
  })

  it.each(['{"payment":"INVALID"}', "not json", "null", "[]"])(
    "ignores invalid stored data: %s",
    (stored) => {
      sessionStorage.setItem("togena:applications-filters:e1", stored)
      expect(readApplicationsSearch("e1")).toEqual({})
    },
  )

  it("ignores fields that are not application filters", () => {
    sessionStorage.setItem(
      "togena:applications-filters:e1",
      JSON.stringify({ payment: "UNPAID", unrelated: "value" }),
    )
    expect(readApplicationsSearch("e1")).toEqual({ payment: "UNPAID" })
  })

  it("continues without persistence when session storage is unavailable", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError")
    })
    expect(() => saveApplicationsSearch("e1", { payment: "PAID" })).not.toThrow()
    expect(readApplicationsSearch("e1")).toEqual({})
  })

  it("continues when writing exceeds the storage quota", () => {
    saveApplicationsSearch("e1", { payment: "UNPAID" })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError")
    })
    expect(() => saveApplicationsSearch("e1", { payment: "PAID" })).not.toThrow()
    saveApplicationsSearch("e1", {})
    expect(readApplicationsSearch("e1")).toEqual({})
  })
})
