import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getClientIp } from '@/lib/security/request'

type RateLimitScopeConfig = {
    maxHits: number
    windowSeconds: number
}

type RateLimitRule = {
    message: string
    ip?: RateLimitScopeConfig
    user?: RateLimitScopeConfig
}

type RateLimitResultRow = {
    allowed: boolean
    hit_count: number
    retry_after_seconds: number
}

export type CriticalActionName =
    | 'login_google_start'
    | 'create_post'
    | 'respond_post'
    | 'mark_response_feedback'
    | 'update_post'
    | 'close_post'

const RATE_LIMIT_RULES: Record<CriticalActionName, RateLimitRule> = {
    login_google_start: {
        message: 'Demasiados intentos de acceso',
        ip: { maxHits: 8, windowSeconds: 300 },
    },
    create_post: {
        message: 'Has alcanzado el límite temporal de publicaciones',
        ip: { maxHits: 8, windowSeconds: 600 },
        user: { maxHits: 4, windowSeconds: 600 },
    },
    respond_post: {
        message: 'Has alcanzado el límite temporal de respuestas',
        ip: { maxHits: 18, windowSeconds: 300 },
        user: { maxHits: 10, windowSeconds: 300 },
    },
    mark_response_feedback: {
        message: 'Has alcanzado el límite temporal de valoraciones',
        ip: { maxHits: 30, windowSeconds: 300 },
        user: { maxHits: 18, windowSeconds: 300 },
    },
    update_post: {
        message: 'Has alcanzado el límite temporal de ediciones',
        ip: { maxHits: 20, windowSeconds: 300 },
        user: { maxHits: 12, windowSeconds: 300 },
    },
    close_post: {
        message: 'Has alcanzado el límite temporal de cierres',
        ip: { maxHits: 10, windowSeconds: 300 },
        user: { maxHits: 6, windowSeconds: 300 },
    },
}

function hashSubject(actionName: CriticalActionName, scope: 'ip' | 'user', rawValue: string) {
    const pepper = process.env.RATE_LIMIT_PEPPER || ''
    return createHash('sha256')
        .update(`${actionName}:${scope}:${rawValue}:${pepper}`)
        .digest('hex')
}

async function enforceScopeLimit(
    supabase: Awaited<ReturnType<typeof createClient>>,
    actionName: CriticalActionName,
    scope: 'ip' | 'user',
    rawValue: string,
    config: RateLimitScopeConfig,
    message: string,
) {
    const subjectHash = hashSubject(actionName, scope, rawValue)
    const { data, error } = await supabase.rpc('enforce_rate_limit', {
        p_action_name: actionName,
        p_subject_scope: scope,
        p_subject_hash: subjectHash,
        p_window_seconds: config.windowSeconds,
        p_max_hits: config.maxHits,
    })

    if (error) {
        console.error('Error enforcing rate limit', {
            actionName,
            scope,
            code: error.code,
            message: error.message,
        })
        throw new Error('No se pudo validar el límite de seguridad. Inténtalo de nuevo.')
    }

    const result = (Array.isArray(data) ? data[0] : data) as RateLimitResultRow | null
    if (!result?.allowed) {
        const retryAfter = Math.max(1, result?.retry_after_seconds || config.windowSeconds)
        throw new Error(`${message}. Espera ${retryAfter} s e inténtalo de nuevo.`)
    }
}

export async function enforceCriticalRateLimit(
    supabase: Awaited<ReturnType<typeof createClient>>,
    actionName: CriticalActionName,
    userId?: string,
) {
    const rule = RATE_LIMIT_RULES[actionName]
    const ipAddress = await getClientIp()

    if (rule.ip && ipAddress) {
        await enforceScopeLimit(supabase, actionName, 'ip', ipAddress, rule.ip, rule.message)
    }

    if (rule.user && userId) {
        await enforceScopeLimit(supabase, actionName, 'user', userId, rule.user, rule.message)
    }
}
