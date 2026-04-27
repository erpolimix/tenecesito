'use client'

import Script from 'next/script'
import { useEffect, useId, useRef, useState } from 'react'
import { TURNSTILE_TOKEN_FIELD } from '@/lib/security/turnstile.shared'

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement,
                options: {
                    sitekey: string
                    action?: string
                    theme?: 'light' | 'dark' | 'auto'
                    callback?: (token: string) => void
                    'expired-callback'?: () => void
                    'error-callback'?: () => void
                },
            ) => string
            remove: (widgetId: string) => void
        }
    }
}

type TurnstileWidgetProps = Readonly<{
    action: 'login' | 'create-post'
    className?: string
    inputName?: string
}>

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function TurnstileWidget({
    action,
    className,
    inputName = TURNSTILE_TOKEN_FIELD,
}: TurnstileWidgetProps) {
    const widgetContainerId = useId().replaceAll(':', '')
    const widgetIdRef = useRef<string | null>(null)
    const [scriptReady, setScriptReady] = useState(false)
    const [token, setToken] = useState('')

    useEffect(() => {
        if (!SITE_KEY || !scriptReady || !globalThis.turnstile) {
            return
        }

        const container = document.getElementById(widgetContainerId)
        if (!container || widgetIdRef.current) {
            return
        }

        widgetIdRef.current = globalThis.turnstile.render(container, {
            sitekey: SITE_KEY,
            action,
            theme: 'light',
            callback: (nextToken) => setToken(nextToken),
            'expired-callback': () => setToken(''),
            'error-callback': () => setToken(''),
        })

        return () => {
            if (widgetIdRef.current && globalThis.turnstile) {
                globalThis.turnstile.remove(widgetIdRef.current)
                widgetIdRef.current = null
            }
        }
    }, [action, scriptReady, widgetContainerId])

    if (!SITE_KEY) {
        return null
    }

    return (
        <div className="space-y-3">
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
                onLoad={() => setScriptReady(true)}
            />
            <input type="hidden" name={inputName} value={token} />
            <div id={widgetContainerId} className={className} />
            <p className="text-xs text-[var(--tn-muted)]">Protección anti-bot activa para este envío.</p>
        </div>
    )
}
