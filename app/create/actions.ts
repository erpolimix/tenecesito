'use server'

import { createClient } from '@/lib/supabase/server'
import {
    NORMAL_PRIORITY,
    URGENT_PRIORITY,
    getUrgentUntilIso,
    hasRecentUrgentCreation,
} from '@/lib/urgency'
import { revalidatePath } from 'next/cache'

import { redirect } from 'next/navigation'

function parseTags(rawTags: string | undefined) {
    if (!rawTags) return [] as string[]

    const unique = new Set<string>()
    for (const piece of rawTags.split(',')) {
        const normalized = piece
            .trim()
            .replace(/^#+/, '')
            .replace(/\s+/g, '')
            .toLowerCase()

        if (!normalized) continue
        if (normalized.length < 2 || normalized.length > 24) continue
        unique.add(normalized)
        if (unique.size >= 8) break
    }

    return Array.from(unique)
}

export async function createPost(formData: FormData) {
    const supabase = await createClient();
    const title = (formData.get('title') as string)?.trim();
    const content = (formData.get('content') as string)?.trim();
    const categoryId = formData.get('categoryId') as string;
    const tagsRaw = formData.get('tags') as string | null;
    const requestedPriority = formData.get('priorityLevel') as string | null;
    const tags = parseTags(tagsRaw || undefined);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión para publicar');

    const priorityLevel = requestedPriority === URGENT_PRIORITY ? URGENT_PRIORITY : NORMAL_PRIORITY;
    let urgentUntil: string | null = null;
    let urgentActivatedAt: string | null = null;

    if (priorityLevel === URGENT_PRIORITY) {
        const now = new Date();
        const { data: recentUrgentPosts, error: recentUrgentPostsError } = await supabase
            .from('posts')
            .select('id, created_at, urgent_activated_at')
            .eq('author_id', user.id)
            .eq('priority_level', URGENT_PRIORITY)
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentUrgentPostsError) throw new Error(recentUrgentPostsError.message);

        const alreadyCreatedUrgentToday = (recentUrgentPosts || []).some((post) =>
            hasRecentUrgentCreation(post.created_at, post.urgent_activated_at, now.getTime())
        );

        if (alreadyCreatedUrgentToday) {
            throw new Error('Solo puedes crear una necesidad urgente cada 24 horas');
        }

        urgentActivatedAt = now.toISOString();
        urgentUntil = getUrgentUntilIso(now);
    }

    const { error } = await supabase.from('posts').insert({
        author_id: user.id,
        category_id: categoryId,
        title,
        content,
        is_closed: false,
        tags,
        priority_level: priorityLevel,
        urgent_until: urgentUntil,
        urgent_activated_at: urgentActivatedAt,
    });

    if (error) throw new Error(error.message);

    revalidatePath('/feed');
    revalidatePath('/dashboard');
    revalidatePath('/comunidad');
    redirect('/feed');
}
