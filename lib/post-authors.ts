import { createClient } from '@/lib/supabase/server'

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

type ProfileRow = {
    id: string
    display_name?: string | null
    avatar_url?: string | null
}

export type PostWithAuthorProfile = {
    author_name: string
    author_avatar_url: string | null
}

function fallbackAuthorName(authorId: string | null | undefined) {
    if (!authorId) return 'Usuario de la comunidad'
    return `Usuario ${authorId.slice(0, 6)}`
}

export async function attachAuthorProfiles<T extends { author_id: string | null }>(
    supabase: ServerSupabaseClient,
    posts: T[],
): Promise<Array<T & PostWithAuthorProfile>> {
    if (posts.length === 0) return []

    const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter(Boolean))) as string[]
    let profilesById = new Map<string, ProfileRow>()

    if (authorIds.length > 0) {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', authorIds)

        if (error) {
            console.error('Error fetching post author profiles', error)
        } else {
            profilesById = new Map(((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile]))
        }
    }

    return posts.map((post) => {
        const profile = post.author_id ? profilesById.get(post.author_id) : undefined
        return {
            ...post,
            author_name: profile?.display_name?.trim() || fallbackAuthorName(post.author_id),
            author_avatar_url: profile?.avatar_url || null,
        }
    })
}
