import { headers } from 'next/headers'

const IP_HEADER_CANDIDATES = [
    'cf-connecting-ip',
    'x-real-ip',
    'x-forwarded-for',
    'x-vercel-forwarded-for',
]

function normalizeIp(rawValue: string | null) {
    if (!rawValue) return null

    const firstValue = rawValue.split(',')[0]?.trim()
    if (!firstValue) return null

    return firstValue.slice(0, 120)
}

export async function getClientIp() {
    const headerStore = await headers()

    for (const headerName of IP_HEADER_CANDIDATES) {
        const candidate = normalizeIp(headerStore.get(headerName))
        if (candidate) return candidate
    }

    return null
}
