'use server'

import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/constants'
import {
    NORMAL_PRIORITY,
    URGENT_PRIORITY,
    getUrgentUntilIso,
    hasRecentUrgentCreation,
} from '@/lib/urgency'
import { revalidatePath } from 'next/cache'

const MIN_TITLE_LENGTH = 8
const MAX_TITLE_LENGTH = 120
const MIN_POST_CONTENT_LENGTH = 20
const MAX_POST_CONTENT_LENGTH = 5000
const CREATE_POST_COOLDOWN_MS = 30_000
const VALID_CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id))

function isWithinCooldown(dateString: string | null | undefined, cooldownMs: number) {
    if (!dateString) return false
    const createdAt = new Date(dateString).getTime()
    if (Number.isNaN(createdAt)) return false
    return Date.now() - createdAt < cooldownMs
}

function validateCreatePostInput(title: string | undefined, content: string | undefined, categoryId: string) {
    if (!title || title.length < MIN_TITLE_LENGTH) {
        return 'El título debe tener al menos 8 caracteres'
    }

    if (title.length > MAX_TITLE_LENGTH) {
        return 'El título no puede superar los 120 caracteres'
    }

    if (!content || content.length < MIN_POST_CONTENT_LENGTH) {
        return 'El contenido debe tener al menos 20 caracteres'
    }

    if (content.length > MAX_POST_CONTENT_LENGTH) {
        return 'El contenido no puede superar los 5000 caracteres'
    }

    if (!categoryId) {
        return 'Debes seleccionar una categoría'
    }

    if (!VALID_CATEGORY_IDS.has(categoryId)) {
        return 'La categoría seleccionada no es válida'
    }

    return null
}

async function getCreateCooldownError(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
    const { data: latestPost, error: latestPostError } = await supabase
        .from('posts')
        .select('created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestPostError) {
        return 'No se pudo validar el ritmo de publicación. Inténtalo de nuevo.'
    }

    if (isWithinCooldown(latestPost?.created_at, CREATE_POST_COOLDOWN_MS)) {
        return 'Espera unos segundos antes de publicar otra necesidad'
    }

    return null
}

function parseTags(rawTags: string | undefined) {
    if (!rawTags) return [] as string[]

    const unique = new Set<string>()
    for (const piece of rawTags.split(',')) {
        const normalized = piece
            .trim()
            .replace(/^#+/, '')
            .replaceAll(/\s+/g, '')
            .toLowerCase()

        if (!normalized) continue
        if (normalized.length < 2 || normalized.length > 24) continue
        unique.add(normalized)
        if (unique.size >= 8) break
    }

    return Array.from(unique)
}

type CreatePostResult = {
    ok: boolean
    error?: string
}

export async function createPost(formData: FormData): Promise<CreatePostResult> {
    const supabase = await createClient();
    const title = (formData.get('title') as string)?.trim();
    const content = (formData.get('content') as string)?.trim();
    const categoryId = formData.get('categoryId') as string;
    const tagsRaw = formData.get('tags') as string | null;
    const requestedPriority = formData.get('priorityLevel') as string | null;
    const tags = parseTags(tagsRaw || undefined);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Debes iniciar sesión para publicar' };

    const cooldownError = await getCreateCooldownError(supabase, user.id)
    if (cooldownError) return { ok: false, error: cooldownError }

    const inputError = validateCreatePostInput(title, content, categoryId)
    if (inputError) return { ok: false, error: inputError }

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

        if (recentUrgentPostsError) {
            return { ok: false, error: 'No se pudo validar tu prioridad urgente. Inténtalo de nuevo.' }
        }

        const alreadyCreatedUrgentToday = (recentUrgentPosts || []).some((post) =>
            hasRecentUrgentCreation(post.created_at, post.urgent_activated_at, now.getTime())
        );

        if (alreadyCreatedUrgentToday) {
            return { ok: false, error: 'Solo puedes crear una necesidad urgente cada 24 horas' };
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

    if (error) {
        return { ok: false, error: 'No se pudo crear la necesidad. Inténtalo de nuevo.' }
    }

    revalidatePath('/feed');
    revalidatePath('/dashboard');
    revalidatePath('/comunidad');

    return { ok: true }
}
