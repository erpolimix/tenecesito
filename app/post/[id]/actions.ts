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

    const profilesById = new Map((profiles || []).map((p) => [p.id, p]));
    return safeResponses.map((response) => {
        const profile = profilesById.get(response.author_id);
        return {
            ...response,
            author_name: profile?.display_name || null,
            author_avatar_url: profile?.avatar_url || null,
        };
    });
}
