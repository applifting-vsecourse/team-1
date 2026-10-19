import { DEFAULT_LOCALE, Locale, LOCALES } from "@/core/email/locale"
import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import { Request } from "express"

/**
 * Picks the supported language with the highest preference from an
 * Accept-Language header (`cs-CZ,cs;q=0.9,en;q=0.8` → `cs`). The frontend
 * sends the UI language there on every request.
 */
export function parseAcceptLanguage(header: string | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";")
      const quality = params.find((param) => param.trim().startsWith("q="))
      return {
        language: tag.trim().toLowerCase().split("-")[0],
        quality: quality ? Number(quality.trim().slice(2)) : 1,
      }
    })
    .sort((a, b) => b.quality - a.quality)
  const match = ranked.find(({ language }) => LOCALES.includes(language as Locale))
  return (match?.language as Locale | undefined) ?? DEFAULT_LOCALE
}

/**
 * The UI language of the request, e.g. to store with a new application so its
 * e-mails go out in that language.
 *
 * @example
 * create(@Body() body: CreateApplicationDto, @RequestLocale() locale: Locale)
 */
export const RequestLocale = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Locale =>
    parseAcceptLanguage(context.switchToHttp().getRequest<Request>().headers["accept-language"]),
)
