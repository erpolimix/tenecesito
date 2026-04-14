'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { MessageSquare, Loader2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { useInView } from 'react-intersection-observer';
import { fetchFeedPosts } from '@/app/feed/actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import { createClient } from '@/lib/supabase/client';

type FeedPost = {
    id: string;
    title: string;
    content: string;
    category_id: string;
    author_name?: string;
    author_avatar_url?: string | null;
    created_at?: string;
    is_closed?: boolean;
    priority_level?: string | null;
    urgent_until?: string | null;
    responses?: Array<{ count: number }>;
}

function getTimeAgoEs(dateString?: string) {
    if (!dateString) return 'Hace un momento';

    const created = new Date(dateString).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - created);
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    if (days < 30) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;

    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

function getExcerpt(content?: string, max = 150) {
    if (!content) return '';
    if (content.length <= max) return content;
    return `${content.slice(0, max).trim()}...`;
}

export default function InfinitePostList({ 
    initialPosts, 
    categoryId,
    urgency,
    showClosed,
}: { 
    initialPosts: FeedPost[], 
    categoryId?: string,
    urgency?: string,
    showClosed?: boolean,
}) {
    const [posts, setPosts] = useState(initialPosts);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialPosts.length >= 9);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const postsRef = useRef(posts);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSyncingRef = useRef(false);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        postsRef.current = posts;
    }, [posts]);

    const mergeUniqueById = useCallback((currentPosts: FeedPost[], incomingPosts: FeedPost[]) => {
        const seen = new Set(currentPosts.map((post) => post.id));
        const merged = [...currentPosts];

        for (const post of incomingPosts) {
            if (seen.has(post.id)) continue;
            seen.add(post.id);
            merged.push(post);
        }

        return merged;
    }, []);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        
        const nextOffset = page * 9;
        const newPosts = await fetchFeedPosts(9, nextOffset, categoryId, urgency, showClosed);
        
        if (newPosts.length === 0) {
            setHasMore(false);
        } else {
            setPosts((prev) => mergeUniqueById(prev, newPosts));
            setPage((prev) => prev + 1);
            if (newPosts.length < 9) {
                setHasMore(false);
            }
        }
        setIsLoadingMore(false);
    }, [page, hasMore, categoryId, urgency, showClosed, isLoadingMore, mergeUniqueById]);

    const syncFeed = useCallback(async () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        const loadedCount = Math.max(9, postsRef.current.length || 0);
        const refreshed = await fetchFeedPosts(loadedCount, 0, categoryId, urgency, showClosed);

        setPosts(refreshed);
        setPage(Math.max(1, Math.ceil(refreshed.length / 9)));
        setHasMore(refreshed.length >= loadedCount);
        isSyncingRef.current = false;
    }, [categoryId, urgency, showClosed]);

    const scheduleSync = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }

        refreshTimerRef.current = setTimeout(() => {
            void syncFeed();
        }, 250);
    }, [syncFeed]);

    useEffect(() => {
        const channel = supabase
            .channel(`feed-live:${categoryId || 'all'}:${urgency || 'all'}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'posts' },
                () => {
                    scheduleSync();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'responses' },
                () => {
                    scheduleSync();
                }
            )
            .subscribe();

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            void supabase.removeChannel(channel);
        };
    }, [supabase, categoryId, urgency, scheduleSync]);

    const [ref] = useInView({
        onChange: (inView) => {
            if (inView) {
                void loadMore();
            }
        },
    });

    if (posts.length === 0) {
        return (
            <div className="col-span-full text-center py-20 rounded-3xl border border-[var(--tn-outline)]/35 bg-white/70">
                <p className="font-editorial text-4xl text-[var(--tn-primary)]">Aún no hay publicaciones aquí.</p>
            </div>
        );
    }

    return (
        <>
            {posts.map(post => {
                const cat = CATEGORIES.find(c => c.id === post.category_id);
                const responseCount = post.responses?.[0]?.count || 0;
                const tone = {
                    bg: cat?.softBg || 'bg-[#ece7e2]',
                    text: cat?.softText || 'text-[#5c524d]'
                };
                const statusClasses = post.is_closed
                    ? 'bg-[#e7e6eb] text-[#5f627a]'
                    : 'bg-[#e7ece8] text-[#4f6353]';
                const statusLabel = post.is_closed ? 'Cerrado' : 'Abierto';
                const timeAgo = getTimeAgoEs(post.created_at);

                return (
                    <article
                        key={post.id}
                        className="bg-white rounded-3xl p-6 md:p-8 tn-card-shadow border border-stone-100 flex flex-col justify-between hover:border-orange-200 transition-colors group h-full"
                    >
                        <div>
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div className="flex flex-wrap gap-2">
                                    <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${tone.bg} ${tone.text}`}>
                                        {cat?.name}
                                    </span>
                                    <UrgencyBadge
                                        priorityLevel={post.priority_level}
                                        urgentUntil={post.urgent_until}
                                        isClosed={post.is_closed}
                                    />
                                    {post.is_closed && (
                                        <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusClasses}`}>
                                            {statusLabel}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-stone-400 font-medium shrink-0">{timeAgo}</span>
                            </div>

                            <h3 className="font-editorial text-[1.95rem] md:text-[2.25rem] text-[var(--tn-text)] leading-[1.12] mb-4 group-hover:text-[var(--tn-primary)] transition-colors max-w-[18ch]">
                                <Link href={`/post/${post.id}`}>{post.title}</Link>
                            </h3>

                            <p className="text-[var(--tn-muted)] leading-[1.72] text-[1.01rem] md:text-[1.08rem] mb-8 max-w-[40ch]">
                                {getExcerpt(post.content)}
                            </p>
                        </div>

                        <div className="pt-6 border-t border-stone-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                {post.author_avatar_url ? (
                                    <img
                                        src={post.author_avatar_url}
                                        alt={`Avatar de ${post.author_name || 'autor'}`}
                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[var(--tn-primary)] font-bold shrink-0 ring-2 ring-white">
                                        {(post.author_name?.[0] || 'A').toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">Publicado por</p>
                                    <p className="text-sm font-semibold text-[var(--tn-text)] truncate">{post.author_name || 'Usuario de la comunidad'}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold text-[var(--tn-primary)]">{responseCount} perspectiva{responseCount === 1 ? '' : 's'}</p>
                                    <p className="text-[10px] text-stone-400">compartida{responseCount === 1 ? '' : 's'}</p>
                                </div>
                                {post.is_closed ? (
                                    <span className="px-6 py-2 rounded-full text-sm font-semibold bg-stone-100 text-stone-400 border border-stone-200">
                                        Cerrada
                                    </span>
                                ) : (
                                    <Link
                                        href={`/post/${post.id}`}
                                        className="bg-[#231d1a] text-white px-7 py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--tn-primary)] transition-colors inline-flex items-center gap-2 shadow-sm"
                                    >
                                        <MessageSquare size={15} />
                                        Apoyar
                                    </Link>
                                )}
                            </div>
                        </div>
                    </article>
                );
            })}
            
            {hasMore && (
                <div ref={ref} className="col-span-full py-10 flex justify-center items-center">
                    <Loader2 className={`text-[var(--tn-primary)] ${isLoadingMore ? 'animate-spin' : ''}`} size={30} />
                </div>
            )}
            
            {!hasMore && posts.length > 0 && (
                <div className="col-span-full text-center py-10">
                    <p className="text-sm text-[var(--tn-muted)]">Has llegado al final</p>
                </div>
            )}
        </>
    );
}
