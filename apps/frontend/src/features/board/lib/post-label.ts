import type { TFunction } from "i18next"

import { termTitle } from "@/lib/term-label"

import type { BoardTerm } from "@/features/board/api/board"

/**
 * The terms of a post in one phrase: the names (or dates) of the terms joined. `Oba termíny` only
 * when the event has exactly two active terms and the post is for both of them; for an event with
 * more terms a pair must still say which two.
 */
export function termsLabel(
  terms: BoardTerm[],
  eventTermCount: number,
  t: TFunction<"board">,
): string {
  if (terms.length === 2 && eventTermCount === 2) return t("terms.both")
  return terms.map((term) => termTitle(term)).join(", ")
}
