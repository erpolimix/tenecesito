'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

    return responses || [];
}
