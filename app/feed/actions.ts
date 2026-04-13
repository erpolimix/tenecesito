'use server'

import { createClient } from '@/lib/supabase/server'
import { URGENT_PRIORITY } from '@/lib/urgency'

export async function fetchFeedPosts(limit: number, offset: number, categoryId?: string, urgency?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const nowIso = new Date().toISOString()

    // Using range for pagination: range(from, to) inclusive
    let query = supabase
        .from('posts')
        .select('*, responses(count)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (user?.id) {
        query = query.neq('author_id', user.id)
    }

    if (categoryId) {
        query = query.eq('category_id', categoryId)
    }

    if (urgency === URGENT_PRIORITY) {
        query = query.eq('priority_level', URGENT_PRIORITY).gt('urgent_until', nowIso).eq('is_closed', false)
    }

    const { data: posts, error } = await query

    if (error) {
        console.error("Error fetching feed posts", error)
        return []
    }

    return posts || []
}
