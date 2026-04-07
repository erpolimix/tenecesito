'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function respondToPost(formData: FormData) {
    const supabase = await createClient();
    const content = formData.get('content') as string;
    const postId = formData.get('postId') as string;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión');

    const { error } = await supabase.from('responses').insert({
        post_id: postId,
        author_id: user.id,
        content
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/post/${postId}`);
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
