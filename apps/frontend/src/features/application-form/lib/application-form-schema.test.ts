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
  birthDate: "2010-05-17",
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
    expect(messagesFor({ ...valid, email: "" })).toContain("This field is required.")
    expect(messagesFor({ ...valid, email: "anna@" })).toContain("Enter a valid e-mail address.")
  })

  it("requires consent", () => {
    expect(messagesFor({ ...valid, consent: false })).toContain(
      "Consent is required to submit the application.",
    )
  })

  it("requires name, gender and at least one term of every participant", () => {
    const messages = messagesFor({
      ...valid,
      participants: [
        { firstName: " ", lastName: "", birthDate: "2010-05-17", gender: undefined, termIds: [] },
      ],
    })
    expect(messages).toEqual(
      expect.arrayContaining([
        "This field is required.",
        "Choose one.",
        "Choose at least one term.",
      ]),
    )
  })

  it("checks the date of birth", () => {
    expect(messagesFor({ ...valid, participants: [{ ...participant, birthDate: "" }] })).toContain(
      "This field is required.",
    )
    expect(
      messagesFor({ ...valid, participants: [{ ...participant, birthDate: "2010-02-31" }] }),
    ).toContain("Enter a valid date.")
    expect(
      messagesFor({ ...valid, participants: [{ ...participant, birthDate: "1850-01-01" }] }),
    ).toContain("Enter a valid date.")
    expect(
      messagesFor({ ...valid, participants: [{ ...participant, birthDate: "2027-06-16" }] }),
    ).toContain("The date of birth can't be in the future.")
    expect(
      schema.safeParse({ ...valid, participants: [{ ...participant, birthDate: "2027-06-15" }] })
        .success,
    ).toBe(true)
  })

  it("needs at least one participant", () => {
    expect(schema.safeParse({ ...valid, participants: [] }).success).toBe(false)
  })
})
