'use server'

import { createClient } from '@/lib/supabase/server'
import { URGENT_PRIORITY } from '@/lib/urgency'

function uniquePostsById<T extends { id: string }>(posts: T[]) {
    const seenIds = new Set<string>()
    const uniquePosts: T[] = []

    for (const post of posts) {
        if (seenIds.has(post.id)) continue
        seenIds.add(post.id)
        uniquePosts.push(post)
    }

    return uniquePosts
}

export async function fetchFeedPosts(limit: number, offset: number, categoryId?: string, urgency?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const nowIso = new Date().toISOString()

    const applyBaseFilters = <T,>(query: T & {
        neq: (column: string, value: string) => T;
        eq: (column: string, value: string | boolean) => T;
    }) => {
        let nextQuery = query

        if (user?.id) {
            nextQuery = nextQuery.neq('author_id', user.id)
        }

        if (categoryId) {
            nextQuery = nextQuery.eq('category_id', categoryId)
        }

        return nextQuery
    }

    if (urgency === URGENT_PRIORITY) {
        const urgentQuery = applyBaseFilters(
            supabase
                .from('posts')
                .select('*, responses(count)')
                .eq('priority_level', URGENT_PRIORITY)
                .gt('urgent_until', nowIso)
                .eq('is_closed', false)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)
        )

        const { data: posts, error } = await urgentQuery

        if (error) {
            console.error("Error fetching feed posts", error)
            return []
        }

        return posts || []
    }

    const urgentQuery = applyBaseFilters(
        supabase
            .from('posts')
            .select('*, responses(count)')
            .eq('priority_level', URGENT_PRIORITY)
            .gt('urgent_until', nowIso)
            .eq('is_closed', false)
            .order('created_at', { ascending: false })
    )

    const { data: urgentPosts, error: urgentError } = await urgentQuery

    if (urgentError) {
        console.error("Error fetching urgent feed posts", urgentError)
        return []
    }

    const urgentCount = urgentPosts?.length || 0
    const urgentSlice = (urgentPosts || []).slice(offset, offset + limit)

    if (urgentSlice.length >= limit) {
        return urgentSlice
    }

    const remaining = limit - urgentSlice.length
    const regularOffset = Math.max(0, offset - urgentCount)
    const regularQuery = applyBaseFilters(
        supabase
            .from('posts')
            .select('*, responses(count)')
            .or(`priority_level.neq.${URGENT_PRIORITY},urgent_until.is.null,urgent_until.lte.${nowIso},is_closed.eq.true`)
            .order('created_at', { ascending: false })
            .range(regularOffset, regularOffset + remaining - 1)
    )

    const { data: regularPosts, error } = await regularQuery

    if (error) {
        console.error("Error fetching feed posts", error)
        return []
    }

    return uniquePostsById([...(urgentSlice || []), ...((regularPosts || []))])
}
