import { Fragment } from "react"
import type { LinkProps } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"

type Props = {
  /** A muted question before the links, e.g. „Jste organizátor?“. */
  question?: string
  links: { to: NonNullable<LinkProps["to"]>; label: string }[]
}

/** The footer of an entry card: a hairline, then the ways to the other entries as inline links. */
export function CardFooterLinks({ question, links }: Props) {
  return (
    <p className="border-t border-border pt-4 text-center text-muted-foreground">
      {question ? `${question} ` : null}
      {links.map((link, index) => (
        <Fragment key={link.label}>
          {index > 0 ? <span aria-hidden>{" · "}</span> : null}
          <Link
            to={link.to}
            className="text-link underline"
          >
            {link.label}
          </Link>
        </Fragment>
      ))}
    </p>
  )
}
