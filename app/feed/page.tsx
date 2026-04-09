import React from 'react';
import Link from 'next/link';
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
        <div className="animate-in fade-in duration-300 max-w-7xl mx-auto px-5 md:px-6 py-10 md:py-12">
            <section className="mb-8 md:mb-10">
                <div className="flex items-end justify-between gap-4 mb-6">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold">Explorar</p>
                        <h1 className="font-editorial text-5xl md:text-6xl font-bold tracking-tight leading-[0.95] mt-2 text-[var(--tn-primary)]">
                            Feed de Necesidades
                        </h1>
                    </div>
                </div>

                <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-3">
                    <Link
                        href="/feed"
                        className={`flex-none px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${!categoryId ? 'bg-[var(--tn-primary)] text-white' : 'bg-white/70 border border-[var(--tn-outline)]/30 hover:bg-[var(--tn-surface)]'}`}
                    >
                        Todas
                    </Link>
                    {CATEGORIES.map((cat) => {
                        const isActive = cat.id === categoryId;
                        return (
                            <Link
                                key={cat.id}
                                href={`/feed?category=${cat.id}`}
                                className={`flex-none px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border ${isActive ? `${cat.softBg} ${cat.softText} border-black/10` : `${cat.softBg} ${cat.softText} border-transparent opacity-80 hover:opacity-100`}`}
                            >
                                {cat.name}
                            </Link>
                        );
                    })}
                </div>

                {currentCat && (
                    <div className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm border border-black/10 ${currentCat.softBg} ${currentCat.softText}`}>
                        <currentCat.icon size={16} strokeWidth={2} />
                        Viendo categoría: <span className="font-semibold">{currentCat.name}</span>
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 items-start">
                <InfinitePostList
                    initialPosts={filteredPosts}
                    categoryId={categoryId}
                    currentUserId={user?.id}
                />
            </section>
        </div>
    );
}