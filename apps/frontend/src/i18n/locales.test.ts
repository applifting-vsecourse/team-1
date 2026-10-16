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
})
