import 'server-only'
import { getClientIp } from '@/lib/security/request'
import { TURNSTILE_TOKEN_FIELD, type BotProtectionAction } from '@/lib/security/turnstile.shared'

type TurnstileVerificationResponse = {
    success: boolean
    action?: string
    'error-codes'?: string[]
}

function isTurnstileConfigured() {
    return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SECRET_KEY)
}

export async function verifyTurnstileToken(formData: FormData, expectedAction: BotProtectionAction) {
    if (!isTurnstileConfigured()) {
        return
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    if (!secretKey || !siteKey) {
        throw new Error('La protección anti-bot no está configurada correctamente')
    }

    const token = formData.get(TURNSTILE_TOKEN_FIELD)
    if (typeof token !== 'string' || token.trim().length === 0) {
        throw new Error('Completa la verificación anti-bot para continuar')
    }

    const remoteIp = await getClientIp()
    const body = new URLSearchParams({
        secret: secretKey,
        response: token,
    })

    if (remoteIp) {
        body.set('remoteip', remoteIp)
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error('No se pudo validar la verificación anti-bot')
    }

    const result = (await response.json()) as TurnstileVerificationResponse
    if (!result.success) {
        throw new Error('No se pudo validar la verificación anti-bot')
    }

    if (result.action && result.action !== expectedAction) {
        throw new Error('La verificación anti-bot no coincide con la acción solicitada')
    }
}
