export const NORMAL_PRIORITY = 'normal'
export const URGENT_PRIORITY = 'urgent'
export const URGENT_WINDOW_HOURS = 24
export const URGENT_WINDOW_MS = URGENT_WINDOW_HOURS * 60 * 60 * 1000

type UrgencyPost = {
    priority_level?: string | null
    urgent_until?: string | null
    is_closed?: boolean | null
}

export function getUrgentUntilIso(now = new Date()) {
    return new Date(now.getTime() + URGENT_WINDOW_MS).toISOString()
}

export function hasRecentUrgentCreation(
    createdAt?: string | null,
    urgentActivatedAt?: string | null,
    now = Date.now()
) {
    const referenceDate = urgentActivatedAt || createdAt

    if (!referenceDate) return false

    const referenceMs = new Date(referenceDate).getTime()
    return Number.isFinite(referenceMs) && now - referenceMs < URGENT_WINDOW_MS
}

export function isUrgentActive(post?: UrgencyPost | null, now = Date.now()) {
    if (!post) return false
    if (post.priority_level !== URGENT_PRIORITY) return false
    if (post.is_closed) return false
    if (!post.urgent_until) return false

    const urgentUntilMs = new Date(post.urgent_until).getTime()
    return Number.isFinite(urgentUntilMs) && urgentUntilMs > now
}