import { Component, type ReactNode } from "react"

import { ROUTES } from "@/app/routes"
import { EmbeddedPageContext } from "@/components/atoms/EmbeddedPage"
import { LogoSymbol } from "@/components/atoms/Logo"
import { ErrorPage } from "@/components/pages/ErrorPage"

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
      <>
        <header className="w-full border-b border-border bg-card">
          <div className="mx-auto flex w-full max-w-224 items-center gap-4 px-4 py-4">
            <a
              href={ROUTES.home}
              className="flex items-center gap-2 text-lg font-semibold tracking-tight md:gap-3 md:text-2xl"
            >
              <LogoSymbol className="size-8 text-primary" />
              <span>togena</span>
            </a>
          </div>
        </header>
        <main className="min-h-svh px-4">
          <EmbeddedPageContext.Provider value>
            <ErrorPage error={this.state.error} />
          </EmbeddedPageContext.Provider>
        </main>
      </>
    )
  }
}
