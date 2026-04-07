'use server'

import { createClient } from '@/lib/supabase/server'

export async function fetchFeedPosts(limit: number, offset: number, categoryId?: string) {
    const supabase = await createClient()

    // Using range for pagination: range(from, to) inclusive
    let query = supabase
        .from('posts')
        .select('*, responses(count)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (categoryId) {
        query = query.eq('category_id', categoryId)
    }

    const { data: posts, error } = await query

    if (error) {
        console.error("Error fetching feed posts", error)
        return []
    }

    return posts || []
}
