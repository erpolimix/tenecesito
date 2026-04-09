'use server'

import { createClient } from '@/lib/supabase/server'
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
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const categoryId = formData.get('categoryId') as string;
    const tagsRaw = formData.get('tags') as string | null;
    const tags = parseTags(tagsRaw || undefined);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión para publicar');

    const { error } = await supabase.from('posts').insert({
        author_id: user.id,
        category_id: categoryId,
        title,
        content,
        is_closed: false,
        tags
    });

    if (error) throw new Error(error.message);

    revalidatePath('/feed');
    redirect('/feed');
}
