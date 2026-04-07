'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
    const supabase = await createClient();
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const categoryId = formData.get('categoryId') as string;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión para publicar');

    const { error } = await supabase.from('posts').insert({
        author_id: user.id,
        category_id: categoryId,
        title,
        content,
        is_closed: false
    });

    if (error) throw new Error(error.message);

    revalidatePath('/feed');
    redirect('/feed');
}
