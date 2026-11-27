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
 * link, no language or theme switchers, like the public header on a system page without
 * „Přihlásit se“) and the page is rendered in its embedded form. The
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
        <header className="w-full border-b border-border bg-card px-4 md:px-8">
          <div className="mx-auto flex h-14 w-full max-w-224 items-center md:h-18">
            <a
              href={ROUTES.home}
              className="flex items-center gap-1.5 text-lg leading-none font-semibold tracking-tight md:gap-2.5 md:text-3xl"
            >
              <LogoSymbol className="size-6 text-logo-symbol md:size-10" />
              <span>togena</span>
            </a>
          </div>
        </header>
        <main className="flex-1 px-4 pt-4 pb-8 md:pt-8">
          <EmbeddedPageContext.Provider value>
            <ErrorPage error={this.state.error} />
          </EmbeddedPageContext.Provider>
        </main>
        <footer className="p-4 text-center text-sm text-muted-foreground">
          {i18n.t("common:publicFooter.signature")}
        </footer>
      </div>
    )
  }
}
