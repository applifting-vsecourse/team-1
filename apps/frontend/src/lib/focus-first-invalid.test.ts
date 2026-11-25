import { afterEach, describe, expect, it, vi } from "vitest"

import { focusFirstInvalidField } from "@/lib/focus-first-invalid"

afterEach(() => {
  document.body.innerHTML = ""
})

function buildForm() {
  const form = document.createElement("form")
  form.innerHTML = `
    <div data-slot="form-item"><input id="ok" aria-invalid="false" /></div>
    <div data-slot="form-item"><input id="hidden" aria-invalid="true" aria-hidden="true" tabindex="-1" /></div>
    <div data-slot="form-item"><input id="first" aria-invalid="true" /></div>
    <div data-slot="form-item"><input id="second" aria-invalid="true" /></div>`
  document.body.append(form)
  const scrolled: HTMLElement[] = []
  for (const item of form.querySelectorAll<HTMLElement>("[data-slot=form-item]")) {
    item.scrollIntoView = vi.fn(() => {
      scrolled.push(item)
    })
  }
  return { form, scrolled }
}

describe("focusFirstInvalidField", () => {
  it("focuses the first visible invalid control and scrolls its item into view", () => {
    const { form, scrolled } = buildForm()

    expect(focusFirstInvalidField(form)).toBe(true)

    expect(document.getElementById("first")).toHaveFocus()
    expect(scrolled).toEqual([document.getElementById("first")?.parentElement])
  })

  it("returns false when nothing is invalid", () => {
    const form = document.createElement("form")
    form.innerHTML = '<input aria-invalid="false" />'
    document.body.append(form)

    expect(focusFirstInvalidField(form)).toBe(false)
  })
})
