import React from 'react';
import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { attachAuthorProfiles } from '@/lib/post-authors';
import { URGENT_PRIORITY } from '@/lib/urgency';
import { createClient } from '@/lib/supabase/server';
import InfinitePostList from '@/components/InfinitePostList';

function buildFeedHref(categoryId?: string, showUrgentOnly?: boolean, showClosed?: boolean) {
    const params = new URLSearchParams();

    if (categoryId) {
        params.set('category', categoryId);
    }

    if (showUrgentOnly) {
        params.set('urgency', URGENT_PRIORITY);
    }

    if (showClosed) {
        params.set('closed', '1');
    }

    const queryString = params.toString();
    return queryString ? `/feed?${queryString}` : '/feed';
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ category?: string; urgency?: string; closed?: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const params = await searchParams;
    const categoryId = params.category;
    const showUrgentOnly = params.urgency === URGENT_PRIORITY;
    const showClosed = params.closed === '1';
    const nowIso = new Date().toISOString();

    let filteredPosts = [];

    if (showUrgentOnly) {
        let urgentQuery = supabase
            .from('posts')
            .select('*, responses(count)')
            .eq('priority_level', URGENT_PRIORITY)
            .gt('urgent_until', nowIso)
            .eq('is_closed', false)
            .order('created_at', { ascending: false })
            .limit(9);

        if (user?.id) {
            urgentQuery = urgentQuery.neq('author_id', user.id);
        }

        if (categoryId) {
            urgentQuery = urgentQuery.eq('category_id', categoryId);
        }

        const { data: posts } = await urgentQuery;
        filteredPosts = posts || [];
    } else {
        let urgentQuery = supabase
            .from('posts')
            .select('*, responses(count)')
            .eq('priority_level', URGENT_PRIORITY)
            .gt('urgent_until', nowIso)
            .eq('is_closed', false)
            .order('created_at', { ascending: false })
            .limit(9);

        let regularQuery = supabase
            .from('posts')
            .select('*, responses(count)')
            .or(`priority_level.neq.${URGENT_PRIORITY},urgent_until.is.null,urgent_until.lte.${nowIso},is_closed.eq.true`)
            .order('created_at', { ascending: false })
            .limit(9);

        if (!showClosed) {
            regularQuery = regularQuery.eq('is_closed', false);
        }

        if (user?.id) {
            urgentQuery = urgentQuery.neq('author_id', user.id);
            regularQuery = regularQuery.neq('author_id', user.id);
        }

        if (categoryId) {
            urgentQuery = urgentQuery.eq('category_id', categoryId);
            regularQuery = regularQuery.eq('category_id', categoryId);
        }

        const [{ data: urgentPosts }, { data: regularPosts }] = await Promise.all([urgentQuery, regularQuery]);
        filteredPosts = [...(urgentPosts || []), ...(regularPosts || [])].slice(0, 9);
    }

    filteredPosts = await attachAuthorProfiles(supabase, filteredPosts || []);

    return (
        <div className="animate-in fade-in duration-300 max-w-6xl mx-auto px-4 pb-20 pt-8 md:px-6 md:pt-10">
            <section className="mb-10 md:mb-12 text-center md:text-left">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                        <span className="inline-block px-4 py-1.5 rounded-full bg-stone-100 text-[#8c5a44] text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4">
                            Comunidad de apoyo
                        </span>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-editorial text-[#2d241a] leading-[1.05] mb-6 md:mb-8">
                            Feed de Necesidades
                        </h1>
                    </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto] sm:justify-start">
                        <Link
                            href={buildFeedHref(undefined, false, showClosed)}
                            className={`tn-filter-btn inline-flex min-h-12 items-center justify-center px-6 py-3 rounded-2xl text-sm border ${!categoryId && !showUrgentOnly ? 'tn-filter-btn-active font-bold border-transparent' : 'bg-white text-[var(--tn-text)] font-semibold border-stone-200 hover:border-stone-300'}`}
                        >
                            Todas
                        </Link>
                        <Link
                            href={buildFeedHref(categoryId, true, showClosed)}
                            className={`tn-filter-btn inline-flex min-h-12 items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm border ${showUrgentOnly ? 'tn-filter-btn-active font-bold border-transparent' : 'bg-white text-[var(--tn-text)] font-semibold border-stone-200 hover:border-stone-300'}`}
                        >
                            <Clock3 size={16} />
                            Urgentes 24h
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center md:justify-start">
                        {CATEGORIES.map((cat) => {
                            const isActive = cat.id === categoryId;
                            return (
                                <Link
                                    key={cat.id}
                                    href={buildFeedHref(cat.id, showUrgentOnly, showClosed)}
                                    className={`tn-filter-btn inline-flex min-h-12 items-center justify-center px-4 py-3 rounded-2xl text-sm transition-colors border ${isActive ? 'tn-filter-btn-active font-bold border-transparent' : 'border-stone-200 bg-white text-[var(--tn-text)] font-semibold hover:border-stone-300'}`}
                                >
                                    {cat.name}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex justify-center md:justify-start">
                        <Link
                            href={buildFeedHref(categoryId, showUrgentOnly, !showClosed)}
                            className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-500 hover:border-stone-300 hover:text-stone-800 transition-colors"
                        >
                            <span className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                                showClosed ? 'bg-[var(--tn-primary)] border-[var(--tn-primary)]' : 'border-stone-300 bg-white'
                            }`}>
                                {showClosed && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </span>
                            Mostrar cerradas
                        </Link>
                    </div>
                </div>

                {showUrgentOnly && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#f1c7bb] bg-[#fff2ed] px-4 py-2 text-sm text-[#8f2f18]">
                        Priorizando necesidades urgentes activas durante 24 horas.
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <InfinitePostList
                    key={`${categoryId || 'all'}:${showUrgentOnly ? URGENT_PRIORITY : 'all'}:${showClosed ? '1' : '0'}`}
                    initialPosts={filteredPosts}
                    categoryId={categoryId}
                    urgency={showUrgentOnly ? URGENT_PRIORITY : undefined}
                    showClosed={showClosed}
                />
            </section>
        </div>
    );
}