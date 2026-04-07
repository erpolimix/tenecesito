'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markPostResponsesAsRead(formData: FormData) {
    const supabase = await createClient()
    const postId = formData.get('postId') as string
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    // Verificamos que el post le pertenece
    const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
    if (!post || post.author_id !== user.id) throw new Error('No autorizado')

    const { error } = await supabase.from('responses').update({ is_read: true }).eq('post_id', postId).eq('is_read', false)
    if (error) console.error("Error updating", error)
    
    revalidatePath('/dashboard')
    revalidatePath('/', 'layout') // to update navbar
}

export async function markAllAsRead() {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    // Find all unread responses for this user's posts
    // We can update them by filtering in SQL if we had RPC, 
    // but without RPC we first get the post IDs
    const { data: userPosts } = await supabase.from('posts').select('id').eq('author_id', user.id)
    if (userPosts && userPosts.length > 0) {
        const postIds = userPosts.map(p => p.id)
        const { error } = await supabase.from('responses').update({ is_read: true }).in('post_id', postIds).eq('is_read', false)
        if (error) console.error("Error updating all", error)
    }

    revalidatePath('/dashboard')
    revalidatePath('/', 'layout')
}
