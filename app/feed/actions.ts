'use server'

import { createClient } from '@/lib/supabase/server'
import { attachAuthorProfiles } from '@/lib/post-authors'
import { URGENT_PRIORITY } from '@/lib/urgency'

const DEFAULT_FEED_PAGE_SIZE = 9
const MAX_FEED_PAGE_SIZE = 24
const MAX_FEED_OFFSET = 500

function normalizeLimit(limit: number) {
    if (!Number.isFinite(limit)) return DEFAULT_FEED_PAGE_SIZE
    return Math.min(MAX_FEED_PAGE_SIZE, Math.max(1, Math.floor(limit)))
}

function normalizeOffset(offset: number) {
    if (!Number.isFinite(offset)) return 0
    return Math.min(MAX_FEED_OFFSET, Math.max(0, Math.floor(offset)))
}

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

async function attachResponseState<T extends { id: string }>(
    supabase: Awaited<ReturnType<typeof createClient>>,
    posts: T[],
    userId?: string,
) {
    if (!userId || posts.length === 0) {
        return posts.map((post) => ({ ...post, hasResponded: false }))
    }

    const postIds = posts.map((post) => post.id)
    const { data: responses, error } = await supabase
        .from('responses')
        .select('post_id')
        .eq('author_id', userId)
        .in('post_id', postIds)

    if (error) {
        console.error('Error fetching feed response state', error)
        return posts.map((post) => ({ ...post, hasResponded: false }))
    }

    const respondedPostIds = new Set((responses || []).map((response) => response.post_id))
    return posts.map((post) => ({
        ...post,
        hasResponded: respondedPostIds.has(post.id),
    }))
}

export async function fetchFeedPosts(limit: number, offset: number, categoryId?: string, urgency?: string, showClosed?: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const nowIso = new Date().toISOString()
    const safeLimit = normalizeLimit(limit)
    const safeOffset = normalizeOffset(offset)

    if (urgency === URGENT_PRIORITY) {
        let urgentQuery = supabase
            .from('posts')
            .select('*, responses(count)')
            .eq('priority_level', URGENT_PRIORITY)
            .gt('urgent_until', nowIso)
            .eq('is_closed', false)
            .order('created_at', { ascending: false })
            .range(safeOffset, safeOffset + safeLimit - 1)

        if (user?.id) {
            urgentQuery = urgentQuery.neq('author_id', user.id)
        }

        if (categoryId) {
            urgentQuery = urgentQuery.eq('category_id', categoryId)
        }

        const { data: posts, error } = await urgentQuery

        if (error) {
            console.error("Error fetching feed posts", error)
            return []
        }

        const postsWithAuthors = await attachAuthorProfiles(supabase, posts || [])
        return await attachResponseState(supabase, postsWithAuthors, user?.id)
    }

    let urgentQuery = supabase
        .from('posts')
        .select('*, responses(count)')
        .eq('priority_level', URGENT_PRIORITY)
        .gt('urgent_until', nowIso)
        .eq('is_closed', false)
        .order('created_at', { ascending: false })

    if (user?.id) {
        urgentQuery = urgentQuery.neq('author_id', user.id)
    }

    if (categoryId) {
        urgentQuery = urgentQuery.eq('category_id', categoryId)
    }

    const { data: urgentPosts, error: urgentError } = await urgentQuery

    if (urgentError) {
        console.error("Error fetching urgent feed posts", urgentError)
        return []
    }

    const urgentCount = urgentPosts?.length || 0
    const urgentSlice = (urgentPosts || []).slice(safeOffset, safeOffset + safeLimit)

    if (urgentSlice.length >= safeLimit) {
        return urgentSlice
    }

    const remaining = safeLimit - urgentSlice.length
    const regularOffset = Math.max(0, safeOffset - urgentCount)
    let regularQuery = supabase
        .from('posts')
        .select('*, responses(count)')
        .or(`priority_level.neq.${URGENT_PRIORITY},urgent_until.is.null,urgent_until.lte.${nowIso},is_closed.eq.true`)
        .order('created_at', { ascending: false })
        .range(regularOffset, regularOffset + remaining - 1)

    if (!showClosed) {
        regularQuery = regularQuery.eq('is_closed', false)
    }

    if (user?.id) {
        regularQuery = regularQuery.neq('author_id', user.id)
    }

    if (categoryId) {
        regularQuery = regularQuery.eq('category_id', categoryId)
    }

    const { data: regularPosts, error } = await regularQuery

    if (error) {
        console.error("Error fetching feed posts", error)
        return []
    }

    const postsWithAuthors = await attachAuthorProfiles(supabase, uniquePostsById([...(urgentSlice || []), ...((regularPosts || []))]))
    return await attachResponseState(supabase, postsWithAuthors, user?.id)
}
