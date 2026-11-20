import { afterEach, describe, expect, it, vi } from "vitest"

import { photoUploadTransport } from "@/features/events/api/photo-upload"

describe("photoUploadTransport", () => {
  afterEach(() => vi.restoreAllMocks())

  it("reports only measured bytes and preserves the API response and request headers", async () => {
    const file = new File(["data"], "photo.png", { type: "image/png" })
    const onProgress = vi.fn()
    const header = vi.spyOn(XMLHttpRequest.prototype, "setRequestHeader")
    vi.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue(
      "Content-Type: application/json\r\n",
    )
    vi.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function (
      this: XMLHttpRequest,
      body,
    ) {
      expect(body).toBe(file)
      expect(this.withCredentials).toBe(true)
      this.upload.dispatchEvent(new ProgressEvent("progress", { loaded: 2 }))
      this.upload.dispatchEvent(
        new ProgressEvent("progress", { lengthComputable: true, loaded: 2, total: 4 }),
      )
      Object.defineProperties(this, {
        status: { value: 400 },
        statusText: { value: "Bad Request" },
        responseText: { value: JSON.stringify({ code: "INVALID_IMAGE" }) },
      })
      this.dispatchEvent(new Event("load"))
      this.dispatchEvent(new Event("loadend"))
    })

    const transfer = photoUploadTransport(file, onProgress)
    const response = await transfer("http://localhost/api/photo", {
      method: "PUT",
      credentials: "include",
      headers: { "X-File-Name": "photo.png" },
    })
    expect(header).toHaveBeenCalledWith("x-file-name", "photo.png")
    expect(onProgress.mock.calls).toEqual([[0.5]])
    expect(response.status).toBe(400)
    expect(response.headers.get("content-type")).toBe("application/json")
    await expect(response.json()).resolves.toEqual({ code: "INVALID_IMAGE" })
  })
})
