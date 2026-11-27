import { Component, type ReactNode } from "react"

import { ROUTES } from "@/app/routes"
import { EmbeddedPageContext } from "@/components/atoms/EmbeddedPage"
import { LogoSymbol } from "@/components/atoms/Logo"
import { ErrorPage } from "@/components/pages/ErrorPage"
import { i18n } from "@/i18n"

type State = { error: unknown; failed: boolean }

/**
 * Last line of defence around `Providers`: catches render errors the router's own error
 * components never see (providers, router setup) and shows the same "Something went wrong" page.
 * This runs outside the router and the theme provider, so the header is static (plain logo
 * link, no language or theme switchers) and the page is rendered in its embedded form. The
 * texts still work: i18n is a global instance. ErrorPage logs the error.
 */
export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, failed: false }

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="flex min-h-svh flex-col">
        <header className="w-full bg-card">
          <div className="flex min-h-20 w-full items-center justify-between gap-4 px-4 py-4 md:min-h-29 md:px-8">
            <a
              href={ROUTES.home}
              className="flex items-center gap-1.5 text-lg leading-none font-semibold tracking-tight md:gap-2.5 md:text-3xl"
            >
              <LogoSymbol className="size-6 text-logo-symbol md:size-10" />
              <span>togena</span>
            </a>
            <a
              href={ROUTES.participant.login}
              className="rounded-control px-4 py-3 text-sm font-medium hover:bg-accent"
            >
              {i18n.t("auth:form.submit")}
            </a>
          </div>
        </header>
        <main className="grid flex-1 content-center px-4 md:px-12">
          <EmbeddedPageContext.Provider value>
            <ErrorPage error={this.state.error} />
          </EmbeddedPageContext.Provider>
        </main>
        <footer className="p-4 text-center text-sm text-muted-foreground">
          {i18n.t("auth:signature")}
        </footer>
      </div>
    )
  }
}
