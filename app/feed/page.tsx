import React from 'react';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/constants';
import { URGENT_PRIORITY } from '@/lib/urgency';
import { createClient } from '@/lib/supabase/server';
import InfinitePostList from '@/components/InfinitePostList';

function buildFeedHref(categoryId?: string, showUrgentOnly?: boolean) {
    const params = new URLSearchParams();

    if (categoryId) {
        params.set('category', categoryId);
    }

    if (showUrgentOnly) {
        params.set('urgency', URGENT_PRIORITY);
    }

    const queryString = params.toString();
    return queryString ? `/feed?${queryString}` : '/feed';
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ category?: string; urgency?: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const params = await searchParams;
    const categoryId = params.category;
    const showUrgentOnly = params.urgency === URGENT_PRIORITY;
    const nowIso = new Date().toISOString();

    const applyBaseFilters = <T,>(query: T & {
        neq: (column: string, value: string) => T;
        eq: (column: string, value: string | boolean) => T;
    }) => {
        let nextQuery = query;

        if (user?.id) {
            nextQuery = nextQuery.neq('author_id', user.id);
        }

        if (categoryId) {
            nextQuery = nextQuery.eq('category_id', categoryId);
        }

        return nextQuery;
    };

    let filteredPosts = [];

    if (showUrgentOnly) {
        const urgentQuery = applyBaseFilters(
            supabase
                .from('posts')
                .select('*, responses(count)')
                .eq('priority_level', URGENT_PRIORITY)
                .gt('urgent_until', nowIso)
                .eq('is_closed', false)
                .order('created_at', { ascending: false })
                .limit(9)
        );

        const { data: posts } = await urgentQuery;
        filteredPosts = posts || [];
    } else {
        const urgentQuery = applyBaseFilters(
            supabase
                .from('posts')
                .select('*, responses(count)')
                .eq('priority_level', URGENT_PRIORITY)
                .gt('urgent_until', nowIso)
                .eq('is_closed', false)
                .order('created_at', { ascending: false })
                .limit(9)
        );

        const regularQuery = applyBaseFilters(
            supabase
                .from('posts')
                .select('*, responses(count)')
                .or(`priority_level.neq.${URGENT_PRIORITY},urgent_until.is.null,urgent_until.lte.${nowIso},is_closed.eq.true`)
                .order('created_at', { ascending: false })
                .limit(9)
        );

        const [{ data: urgentPosts }, { data: regularPosts }] = await Promise.all([urgentQuery, regularQuery]);
        filteredPosts = [...(urgentPosts || []), ...(regularPosts || [])].slice(0, 9);
    }

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
                        className={`flex-none px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${!categoryId && !showUrgentOnly ? 'bg-[var(--tn-primary)] text-white' : 'bg-white/70 border border-[var(--tn-outline)]/30 hover:bg-[var(--tn-surface)]'}`}
                    >
                        Todas
                    </Link>
                    <Link
                        href={buildFeedHref(categoryId, true)}
                        className={`flex-none px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${showUrgentOnly ? 'bg-[#8f2f18] text-white' : 'bg-[#fff2ed] text-[#8f2f18] border border-[#f1c7bb] hover:bg-[#ffebe4]'}`}
                    >
                        Urgentes 24h
                    </Link>
                    {CATEGORIES.map((cat) => {
                        const isActive = cat.id === categoryId;
                        return (
                            <Link
                                key={cat.id}
                                href={buildFeedHref(cat.id, showUrgentOnly)}
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

                {showUrgentOnly && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#f1c7bb] bg-[#fff2ed] px-4 py-2 text-sm text-[#8f2f18]">
                        Priorizando necesidades urgentes activas durante 24 horas.
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 items-start">
                <InfinitePostList
                    key={`${categoryId || 'all'}:${showUrgentOnly ? URGENT_PRIORITY : 'all'}`}
                    initialPosts={filteredPosts}
                    categoryId={categoryId}
                    urgency={showUrgentOnly ? URGENT_PRIORITY : undefined}
                />
            </section>
        </div>
    );
}