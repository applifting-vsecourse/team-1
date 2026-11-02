import { parseVariableSymbol, variableSymbol } from "./variable-symbol"

describe("variableSymbol", () => {
  it("builds the summary and per-term symbols", () => {
    expect(variableSymbol(12345)).toBe("12345000")
    expect(variableSymbol(12345, 1)).toBe("12345001")
    expect(variableSymbol(12345, 2)).toBe("12345002")
    expect(variableSymbol(1, 999)).toBe("1999")
  })

  it("fits the 10 digits a bank allows", () => {
    expect(variableSymbol(8_999_999, 999)).toBe("8999999999")
  })

  it("rejects numbers out of range", () => {
    expect(() => variableSymbol(0)).toThrow(RangeError)
    expect(() => variableSymbol(9_000_000)).toThrow(RangeError)
    expect(() => variableSymbol(1, 1000)).toThrow(RangeError)
    expect(() => variableSymbol(1, -1)).toThrow(RangeError)
  })
})

describe("parseVariableSymbol", () => {
  it("round-trips the pair", () => {
    for (const [application, term] of [
      [12345, 1],
      [1, 999],
      [8_999_999, 42],
    ]) {
      expect(parseVariableSymbol(variableSymbol(application, term))).toEqual({
        applicationNumber: application,
        termNumber: term,
      })
    }
  })

  it("returns null term for the summary symbol", () => {
    expect(parseVariableSymbol("12345000")).toEqual({ applicationNumber: 12345, termNumber: null })
  })

  it("ignores leading zeros", () => {
    expect(parseVariableSymbol("0012345001")).toEqual({ applicationNumber: 12345, termNumber: 1 })
  })

  it("rejects what is not a symbol", () => {
    expect(parseVariableSymbol("")).toBeNull()
    expect(parseVariableSymbol("12a")).toBeNull()
    expect(parseVariableSymbol("999")).toBeNull()
    expect(parseVariableSymbol("12345678901")).toBeNull()
    expect(parseVariableSymbol("9000000000")).toBeNull()
  })
})
