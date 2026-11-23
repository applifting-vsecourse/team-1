import { describe, expect, it } from "vitest"

import { resources } from "@/i18n/resources"

type Tree = { [key: string]: string | Tree }

const keysOf = (tree: Tree, prefix = ""): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : keysOf(value, `${prefix}${key}.`),
  )

// A key added to one language only would silently fall back to English.
describe("translations", () => {
  it.each(Object.keys(resources.en))("cs and en have the same keys in %s", (namespace) => {
    const en = resources.en[namespace as keyof typeof resources.en] as Tree
    const cs = resources.cs[namespace as keyof typeof resources.cs] as Tree
    expect(keysOf(cs).sort()).toEqual(keysOf(en).sort())
  })

  // Czech has four plural forms (one, few, many for fractions, other); a missing one
  // makes i18next fall back to English. The forms come from the runtime, not a hand list.
  const forms = new Intl.PluralRules("cs").resolvedOptions().pluralCategories
  const suffix = new RegExp(`_(${forms.join("|")})$`)

  it.each(Object.keys(resources.cs))("cs plural keys in %s cover every form", (namespace) => {
    const keys = keysOf(resources.cs[namespace as keyof typeof resources.cs])
    const bases = new Set(
      keys.filter((key) => suffix.test(key)).map((key) => key.replace(suffix, "")),
    )
    const missing = [...bases].flatMap((base) =>
      forms.filter((form) => !keys.includes(`${base}_${form}`)).map((form) => `${base}_${form}`),
    )
    expect(missing).toEqual([])
  })
})
