import { Fragment } from "react"
import type { LinkProps } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"

type Props = {
  /** A muted question before the links, e.g. „Jste organizátor?“. */
  question?: string
  links: { to: NonNullable<LinkProps["to"]>; label: string }[]
}

/**
 * The footer of an entry card: a hairline, then the ways to the other entries as inline links.
 * Each link stays in one piece; on a phone they wrap onto their own lines without the „·“.
 */
export function CardFooterLinks({ question, links }: Props) {
  return (
    <p className="flex flex-wrap justify-center gap-x-1 border-t border-border pt-4 text-center text-muted-foreground">
      {question ? <span>{question}</span> : null}
      {links.map((link, index) => (
        <Fragment key={link.label}>
          {index > 0 ? (
            <span
              aria-hidden
              className="max-md:hidden"
            >
              ·
            </span>
          ) : null}
          <Link
            to={link.to}
            className="whitespace-nowrap text-link underline"
          >
            {link.label}
          </Link>
        </Fragment>
      ))}
    </p>
  )
}
