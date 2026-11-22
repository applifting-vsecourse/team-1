import type { TFunction } from "i18next"

import { termTitle } from "@/lib/term-label"

import type { BoardTerm } from "@/features/board/api/board"

/**
 * The terms of a post in one phrase: the name of the one term, `Oba termíny` for two, the names
 * joined for more.
 */
export function termsLabel(terms: BoardTerm[], t: TFunction<"board">): string {
  if (terms.length === 2) return t("terms.both")
  return terms.map((term) => termTitle(term)).join(", ")
}
