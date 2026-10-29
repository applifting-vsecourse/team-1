import { afterEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"
import { resources } from "@/i18n/resources"
import { api, apiErrorCode, HTTPError } from "@/lib/api-client"

const requestError = async (body: unknown, status = 409): Promise<unknown> => {
  const client = api.extend({
    fetch: vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  })
  try {
    await client.patch("organizer/events/test/room-mode", { json: { roomMode: "GENDERED" } })
    throw new Error("Expected request to fail")
  } catch (error) {
    return error
  }
}

afterEach(async () => {
  await i18n.changeLanguage("en")
})

describe("API error messages", () => {
  it.each(["cs", "en"] as const)(
    "translates the consumed room-mode error body in %s",
    async (language) => {
      await i18n.changeLanguage(language)
      const error = await requestError({
        statusCode: 409,
        code: "ROOM_MODE_REQUIRES_EMPTY_ROOMS",
        message: "ROOM_MODE_REQUIRES_EMPTY_ROOMS",
      })
      expect(error).toBeInstanceOf(HTTPError)
      expect((error as HTTPError).response.bodyUsed).toBe(true)
      expect((error as Error).message).toBe(
        resources[language].errors.ROOM_MODE_REQUIRES_EMPTY_ROOMS,
      )
      expect(apiErrorCode(error)).toBe("ROOM_MODE_REQUIRES_EMPTY_ROOMS")
    },
  )

  it("preserves the error code used for duplicate-name field validation", async () => {
    const error = await requestError({ code: "ROOM_NAME_TAKEN", message: "ROOM_NAME_TAKEN" })
    expect(apiErrorCode(error)).toBe("ROOM_NAME_TAKEN")
    expect((error as Error).message).toBe(resources.en.errors.ROOM_NAME_TAKEN)
  })

  it.each([
    ["cs", "Přihláška už existuje. Účastník: Jan Novák, termín: „T1“."],
    ["en", "Jan Novák is already registered for the term “T1”"],
  ] as const)("fills the error params into the translation in %s", async (language, expected) => {
    await i18n.changeLanguage(language)
    const error = await requestError({
      statusCode: 409,
      code: "APPLICATION_DUPLICATE",
      message: "Participant is already registered for this term",
      params: { participant: "Jan Novák", term: "T1" },
    })
    expect((error as Error).message).toContain(expected)
    expect(apiErrorCode(error)).toBe("APPLICATION_DUPLICATE")
  })

  it("uses the server message for an unknown code", async () => {
    const error = await requestError(
      { code: "NEW_CODE", message: ["First problem", "Second problem"] },
      400,
    )
    expect((error as Error).message).toBe("First problem, Second problem")
  })

  it("keeps the default HTTP error when the payload is not an error object", async () => {
    const error = await requestError("Service unavailable", 503)
    expect(error).toBeInstanceOf(HTTPError)
    expect((error as Error).message).toContain("503")
  })
})
