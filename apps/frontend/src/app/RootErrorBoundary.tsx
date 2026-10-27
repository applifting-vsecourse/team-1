import { Component, type ErrorInfo, type ReactNode } from "react"

import { ErrorPage } from "@/components/pages/ErrorPage"

type State = { error: unknown; failed: boolean }

/**
 * Last line of defence around `Providers`: catches render errors the router's own error
 * components never see (providers, router setup) and shows the same "Something went wrong" page.
 * The page needs no router, query or theme provider; i18n is a global instance.
 */
export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, failed: false }

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.failed) return <ErrorPage error={this.state.error} />
    return this.props.children
  }
}
