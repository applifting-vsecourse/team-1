import "@testing-library/jest-dom/vitest"

import { i18n } from "@/i18n"

// Tests assert on English copy.
void i18n.changeLanguage("en")

// jsdom lacks what Radix (Select, Radio group) calls.
globalThis.ResizeObserver ??= class {
  observe() {
    return undefined
  }
  unobserve() {
    return undefined
  }
  disconnect() {
    return undefined
  }
}
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
})
