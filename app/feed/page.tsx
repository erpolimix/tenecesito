import React from 'react';
import Link from 'next/link';
import { Lock, MessageSquare } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import InfinitePostList from '@/components/InfinitePostList';

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const params = await searchParams;
    const categoryId = params.category;

    let query = supabase.from('posts').select('*, responses(count)').order('created_at', { ascending: false }).limit(9);
    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }
    
    const { data: posts } = await query;
    const filteredPosts = posts || [];

    const currentCat = CATEGORIES.find(c => c.id === categoryId);

    return (
        <div className="animate-in fade-in duration-300">
            {currentCat && (
                <div className={`${currentCat.bg} border-b-4 border-black py-12 px-6`}>
                    <div className="max-w-7xl mx-auto flex items-center gap-4">
                        <currentCat.icon size={48} strokeWidth={2} />
                        <h1 className="text-5xl font-black uppercase tracking-tighter">{currentCat.name}</h1>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <InfinitePostList 
                        initialPosts={filteredPosts} 
                        categoryId={categoryId} 
                        currentUserId={user?.id}
                    />
                </div>
            </div>
        </div>
    );
}