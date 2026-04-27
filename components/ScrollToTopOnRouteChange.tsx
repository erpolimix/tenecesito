'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function scrollPageToTop() {
    globalThis.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
}

export default function ScrollToTopOnRouteChange() {
    const pathname = usePathname()

    useEffect(() => {
        const frameId = globalThis.requestAnimationFrame(() => {
            scrollPageToTop()

            // Un segundo intento ayuda en móvil cuando el layout termina de asentarse
            // tras una navegación cliente con elementos sticky o contenido diferido.
            globalThis.setTimeout(scrollPageToTop, 0)
        })

        return () => {
            globalThis.cancelAnimationFrame(frameId)
        }
    }, [pathname])

    return null
}
