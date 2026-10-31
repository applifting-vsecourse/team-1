import { describe, expect, it } from "vitest"

import { i18n } from "@/i18n"

import { createApplicationFormSchema } from "@/features/application-form/lib/application-form-schema"

const schema = createApplicationFormSchema(
  i18n.getFixedT("en", "applicationForm"),
  new Date("2027-06-15T10:00:00Z"),
)

const participant = {
  firstName: "Anna",
  lastName: "Nováková",
  birthDate: "17. 5. 2010",
  gender: "FEMALE",
  termIds: ["t1"],
}
const valid = { email: "anna@example.com", consent: true, participants: [participant] }

const messagesFor = (input: unknown) => {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe("application form schema", () => {
  it("accepts a complete application", () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it("accepts several participants, each with their own terms", () => {
    const result = schema.safeParse({
      ...valid,
      participants: [
        participant,
        { ...participant, firstName: "Petr", gender: "MALE", termIds: ["t1", "t2"] },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("requires the contact e-mail to look like one", () => {
    expect(messagesFor({ ...valid, email: "" })).toContain("Enter a valid e-mail address.")
    expect(messagesFor({ ...valid, email: "anna@" })).toContain("Enter a valid e-mail address.")
  })

  it("requires consent", () => {
    expect(messagesFor({ ...valid, consent: false })).toContain(
      "Consent to the processing of personal data is required to submit.",
    )
  })

  it("requires name, gender and at least one term of every participant", () => {
    const messages = messagesFor({
      ...valid,
      participants: [
        { firstName: " ", lastName: "", birthDate: "17. 5. 2010", gender: undefined, termIds: [] },
      ],
    })
    expect(messages).toEqual(
      expect.arrayContaining([
        "Enter the first name.",
        "Enter the last name.",
        "Choose Woman or Man.",
        "Choose at least one term.",
      ]),
    )
  })

  it("checks the date of birth", () => {
    expect(messagesFor({ ...valid, participants: [{ ...participant, birthDate: "" }] })).toContain(
      "Enter a valid date of birth.",
    )
    expect(
      messagesFor({ ...valid, participants: [{ ...participant, birthDate: "31. 2. 2010" }] }),
    ).toContain("Enter the date as DD/MM/YYYY.")
    expect(
      messagesFor({ ...valid, participants: [{ ...participant, birthDate: "17. 5." }] }),
    ).toContain("Enter the date as DD/MM/YYYY.")
    expect(
      messagesFor({ ...valid, participants: [{ ...participant, birthDate: "1. 1. 1850" }] }),
    ).toContain("Enter a valid date of birth.")
    expect(
      messagesFor({ ...valid, participants: [{ ...participant, birthDate: "16. 6. 2027" }] }),
    ).toContain("Enter a valid date of birth.")
    expect(
      schema.safeParse({ ...valid, participants: [{ ...participant, birthDate: "15. 6. 2027" }] })
        .success,
    ).toBe(true)
  })

  it("sends the typed date of birth as an ISO date", () => {
    const result = schema.parse(valid)
    expect(result.participants[0]?.birthDate).toBe("2010-05-17")
  })

  it("needs at least one participant", () => {
    expect(schema.safeParse({ ...valid, participants: [] }).success).toBe(false)
  })
})
