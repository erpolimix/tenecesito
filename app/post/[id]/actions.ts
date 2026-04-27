'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type ResponseFeedbackType = 'util' | 'reveladora'

function getFeedbackErrorStatus(error: { code?: string | null; message?: string | null }) {
    const message = error.message || ''
    if (message.includes('forbidden')) return 'sin-permiso'
    if (message.includes('already_feedbacked')) return 'ya-valorada'
    if (
        error.code === 'PGRST202' ||
        message.includes('Could not find the function') ||
        message.includes('No function matches')
    ) {
        return 'migracion-pendiente'
    }
    if (message.includes('foreign key constraint')) return 'perfil-faltante'
    return 'error-servidor'
}

function getFeedbackErrorDetail(error: { code?: string | null; message?: string | null }) {
    const message = (error.message || '').toLowerCase()
    const code = error.code || 'sin-codigo'

    if (code === '42702') return `${code}:ambiguous_column`

    if (message.includes('already_feedbacked')) return `${code}:already_feedbacked`
    if (message.includes('forbidden')) return `${code}:forbidden`
    if (message.includes('could not find the function') || message.includes('no function matches')) return `${code}:rpc_missing`
    if (message.includes('foreign key constraint')) return `${code}:foreign_key`
    if (message.includes('permission denied')) return `${code}:permission_denied`
    if (message.includes('violates unique constraint')) return `${code}:unique_constraint`
    return `${code}:unknown`
}

function getFeedbackRedirectPath(postId: string, status: string, extra?: string) {
    const basePath = postId ? `/post/${postId}` : '/feed'
    const params = new URLSearchParams({ feedback: status })
    if (extra) params.set('detalle', extra)
    return `${basePath}?${params.toString()}`
}

function parseFeedbackType(value: string | null): ResponseFeedbackType {
    if (value === 'util' || value === 'reveladora') return value
    throw new Error('Tipo de valoracion invalido')
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

export async function respondToPost(formData: FormData) {
    const supabase = await createClient();
    const content = (formData.get('content') as string)?.trim();
    const postId = formData.get('postId') as string;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión');

    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('author_id, is_closed')
        .eq('id', postId)
        .single();

    if (postError || !post) throw new Error('La publicación no existe');
    if (post.is_closed) throw new Error('Esta necesidad ya está cerrada');
    if (post.author_id === user.id) throw new Error('No puedes responder tu propia necesidad');

    const { data: existingResponse } = await supabase
        .from('responses')
        .select('id')
        .eq('post_id', postId)
        .eq('author_id', user.id)
        .maybeSingle();

    if (existingResponse) throw new Error('Ya has aportado tu perspectiva a esta necesidad');

    const { error } = await supabase.from('responses').insert({
        post_id: postId,
        author_id: user.id,
        content
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/post/${postId}`);
    revalidatePath('/feed');
}

export async function closePost(formData: FormData) {
    const supabase = await createClient();
    const postId = formData.get('postId') as string;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión');

    const { error } = await supabase.from('posts').update({ is_closed: true }).eq('id', postId).eq('author_id', user.id);

    if (error) throw new Error(error.message);

    revalidatePath(`/post/${postId}`);
}

export async function markResponseFeedback(formData: FormData) {
    const supabase = await createClient();
    const postId = formData.get('postId') as string;
    const responseId = formData.get('responseId') as string;
    const feedbackRaw = (formData.get('feedbackType') as string | null) || null;

    let feedbackType: ResponseFeedbackType;
    try {
        feedbackType = parseFeedbackType(feedbackRaw);
    } catch {
        redirect(getFeedbackRedirectPath(postId, 'tipo-invalido'));
    }

    if (!postId || !responseId) {
        redirect(getFeedbackRedirectPath(postId, 'datos-invalidos'));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        const nextPath = postId ? `/post/${postId}` : '/feed';
        redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }

    console.info('markResponseFeedback:start', {
        postId,
        responseId,
        feedbackType,
        actorUserId: user.id,
    });

    const { data, error } = await supabase.rpc('apply_response_feedback', {
        p_response_id: responseId,
        p_feedback_type: feedbackType,
    });

    if (error) {
        console.error('Error marking response feedback', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            postId,
            responseId,
            feedbackType,
        });

        redirect(getFeedbackRedirectPath(postId, getFeedbackErrorStatus(error), getFeedbackErrorDetail(error)));
    }

    console.info('markResponseFeedback:success', {
        postId,
        responseId,
        feedbackType,
        rpcRows: Array.isArray(data) ? data.length : 0,
    });

    const updated = Array.isArray(data) ? data[0] : null;
    const responseAuthorId = updated?.response_author_id as string | undefined;

    revalidatePath(`/post/${postId}`);
    revalidatePath('/comunidad');
    revalidatePath('/dashboard');
    revalidatePath('/notificaciones');
    if (responseAuthorId) {
        revalidatePath(`/perfil/${responseAuthorId}`);
    }
    redirect(getFeedbackRedirectPath(postId, 'ok', feedbackType));
}

export async function updatePost(formData: FormData) {
    const supabase = await createClient();
    const postId = formData.get('postId') as string;
    const title = (formData.get('title') as string)?.trim();
    const content = (formData.get('content') as string)?.trim();
    const categoryId = formData.get('categoryId') as string;
    const tagsRaw = formData.get('tags') as string | null;
    const tags = parseTags(tagsRaw || undefined);

    if (!postId) throw new Error('Publicación inválida');
    if (!title || title.length < 8) throw new Error('El título debe tener al menos 8 caracteres');
    if (!content || content.length < 20) throw new Error('El contenido debe tener al menos 20 caracteres');
    if (!categoryId) throw new Error('Debes seleccionar una categoría');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión');

    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('author_id, is_closed')
        .eq('id', postId)
        .single();

    if (postError || !post) throw new Error('La publicación no existe');
    if (post.author_id !== user.id) throw new Error('No tienes permiso para editar esta publicación');
    if (post.is_closed) throw new Error('No puedes editar una publicación cerrada');

    const { error } = await supabase
        .from('posts')
        .update({
            title,
            content,
            category_id: categoryId,
            tags,
        })
        .eq('id', postId)
        .eq('author_id', user.id);

    if (error) throw new Error(error.message);

    revalidatePath(`/post/${postId}`);
    revalidatePath('/dashboard');
    revalidatePath('/feed');
    redirect(`/post/${postId}`);
}

export async function fetchPostResponses(postId: string, limit: number, offset: number) {
    const supabase = await createClient();
    
    const { data: responses, error } = await supabase
        .from('responses')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error("Error fetching responses", error);
        return [];
    }

    const safeResponses = responses || [];
    if (safeResponses.length === 0) return [];

    const authorIds = Array.from(new Set(safeResponses.map((r) => r.author_id).filter(Boolean)));
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', authorIds);

    if (profilesError) {
        console.error('Error fetching response authors', profilesError);
        return safeResponses;
    }

    const { data: stats, error: statsError } = await supabase
        .from('user_gamification_stats')
        .select('user_id, total_points, current_level, current_streak_days')
        .in('user_id', authorIds);

    if (statsError) {
        console.error('Error fetching response author gamification stats', statsError);
    }

    const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select('user_id, badge_key')
        .in('user_id', authorIds)
        .eq('status', 'active')
        .order('earned_at', { ascending: false });

    if (badgesError) {
        console.error('Error fetching response author badges', badgesError);
    }

    const profilesById = new Map((profiles || []).map((p) => [p.id, p]));
    const statsById = new Map((stats || []).map((item) => [item.user_id, item]));
    const badgesById = new Map<string, string[]>();
    for (const badge of badges || []) {
        const current = badgesById.get(badge.user_id) || [];
        if (current.length < 3) current.push(badge.badge_key);
        badgesById.set(badge.user_id, current);
    }

    return safeResponses.map((response) => {
        const profile = profilesById.get(response.author_id);
        const statsForAuthor = statsById.get(response.author_id);
        return {
            ...response,
            author_name: profile?.display_name || null,
            author_avatar_url: profile?.avatar_url || null,
            author_total_points: statsForAuthor?.total_points || 0,
            author_current_level: statsForAuthor?.current_level || 'Semilla',
            author_streak_days: statsForAuthor?.current_streak_days || 0,
            author_active_badges: badgesById.get(response.author_id) || [],
        };
    });
}
