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
    action: 'login' | 'create-post' | 'respond-post' | 'update-post' | 'close-post'
    className?: string
    inputName?: string
    helperText?: string | null
}>

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

function getTurnstileApi() {
    if (globalThis.window === undefined) {
        return undefined
    }

    return (globalThis as typeof globalThis & { window: Window }).window.turnstile
}

export default function TurnstileWidget({
    action,
    className,
    inputName = TURNSTILE_TOKEN_FIELD,
    helperText = 'Protección anti-bot activa para este envío.',
}: TurnstileWidgetProps) {
    const widgetContainerId = useId().replaceAll(':', '')
    const widgetIdRef = useRef<string | null>(null)
    const [scriptReady, setScriptReady] = useState(false)
    const [token, setToken] = useState('')

    useEffect(() => {
        const turnstile = getTurnstileApi()

        if (!SITE_KEY || !scriptReady || !turnstile) {
            return
        }

        const container = document.getElementById(widgetContainerId)
        if (!container || widgetIdRef.current) {
            return
        }

        widgetIdRef.current = turnstile.render(container, {
            sitekey: SITE_KEY,
            action,
            theme: 'light',
            callback: (nextToken) => setToken(nextToken),
            'expired-callback': () => setToken(''),
            'error-callback': () => setToken(''),
        })

        return () => {
            if (widgetIdRef.current) {
                turnstile.remove(widgetIdRef.current)
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
            {helperText && <p className="text-xs text-[var(--tn-muted)]">{helperText}</p>}
        </div>
    )
}
