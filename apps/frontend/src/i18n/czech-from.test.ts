import { describe, expect, it } from "vitest"

import { czechFrom } from "@/i18n/czech-from"

describe("czechFrom", () => {
  it.each([
    [0, "z 0"],
    [1, "z 1"],
    [2, "ze 2"],
    [3, "ze 3"],
    [4, "z 4"],
    [5, "z 5"],
    [6, "ze 6"],
    [7, "ze 7"],
    [8, "z 8"],
    [9, "z 9"],
    [10, "z 10"],
    [12, "ze 12"],
    [14, "z 14"],
    [16, "ze 16"],
    [17, "ze 17"],
    [20, "ze 20"],
    [21, "z 21"],
    [22, "ze 22"],
    [13, "z 13"],
    [23, "z 23"],
    [30, "z 30"],
    [60, "ze 60"],
    [70, "ze 70"],
    [100, "ze 100"],
    [120, "ze 120"],
    [200, "ze 200"],
    [300, "ze 300"],
    [650, "ze 650"],
    [1000, "z 1000"],
    [2000, "ze 2000"],
    [3000, "ze 3000"],
    [3500, "ze 3500"],
  ])("%i → %s", (value, expected) => {
    // A non-breaking space separates the preposition from the number.
    expect(czechFrom(value)).toBe(expected.replace(" ", "\u00A0"))
  })
})
