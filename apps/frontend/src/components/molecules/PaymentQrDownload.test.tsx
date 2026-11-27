import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PaymentQrDownload } from "@/components/molecules/PaymentQrDownload"

const { toDataURL } = vi.hoisted(() => ({
  toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,qr")),
}))
vi.mock("qrcode", () => ({ default: { toDataURL } }))

const renderQr = (layout?: "stacked" | "inline") =>
  render(
    <PaymentQrDownload
      spayd="SPD*1.0*ACC:CZ0000000000000000000000*AM:4500.00*X-VS:166000"
      variableSymbol="166000"
      layout={layout}
    />,
  )

describe("PaymentQrDownload", () => {
  it("stacks the large code above the button by default", async () => {
    renderQr()

    const image = await screen.findByRole("img", { name: "QR code for the combined payment" })
    expect(image).toHaveClass("size-40")
    expect(image).not.toHaveClass("hidden")
    expect(image.parentElement).toHaveClass("flex-col")
    expect(
      screen.getByRole("button", { name: "Download QR code" }).querySelector("svg"),
    ).not.toBeNull()
  })

  // The summary row after sending the application (Figma 27439-16621).
  it("puts a small code next to the button from sm and only the button below it when inline", async () => {
    renderQr("inline")

    const image = await screen.findByRole("img", { name: "QR code for the combined payment" })
    expect(image).toHaveClass("hidden", "sm:block", "size-28")
    expect(image.parentElement).not.toHaveClass("flex-col")
    expect(image.parentElement).toHaveClass("flex-wrap", "items-center", "gap-x-4")
    // Text only, at the width of the other actions on the page (Figma 27439:16627).
    const button = screen.getByRole("button", { name: "Download QR code" })
    expect(button).toBeEnabled()
    expect(button).toHaveClass("min-w-55")
    expect(button.querySelector("svg")).toBeNull()
  })
})
