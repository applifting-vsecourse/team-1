import { createContext, useContext } from "react"

/**
 * True below a page that already has its own chrome (the area layouts' workspace). System
 * pages (error, 404) then render just their content, without a second public header or a
 * full-viewport `<main>`.
 */
export const EmbeddedPageContext = createContext(false)

export const useIsEmbeddedPage = () => useContext(EmbeddedPageContext)
