'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Loader2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { useInView } from 'react-intersection-observer';
import { fetchFeedPosts } from '@/app/feed/actions';
import UrgencyBadge from '@/components/UrgencyBadge';

type FeedPost = {
    id: string;
    title: string;
    content: string;
    category_id: string;
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
}: { 
    initialPosts: FeedPost[], 
    categoryId?: string,
    urgency?: string,
}) {
    const [posts, setPosts] = useState(initialPosts);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialPosts.length >= 9);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        
        const nextOffset = page * 9;
        const newPosts = await fetchFeedPosts(9, nextOffset, categoryId, urgency);
        
        if (newPosts.length === 0) {
            setHasMore(false);
        } else {
            setPosts((prev) => [...prev, ...newPosts]);
            setPage((prev) => prev + 1);
            if (newPosts.length < 9) {
                setHasMore(false);
            }
        }
        setIsLoadingMore(false);
    }, [page, hasMore, categoryId, urgency, isLoadingMore]);

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
                    <Link
                        href={`/post/${post.id}`}
                        key={post.id}
                        className="bg-white/85 border border-[var(--tn-outline)]/35 rounded-3xl p-6 md:p-7 cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(27,28,27,0.12)] transition-all flex flex-col h-full"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <span className={`text-xs font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-sm ${tone.bg} ${tone.text}`}>
                                {cat?.name}
                            </span>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1 ${statusClasses}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                                    {statusLabel}
                                </span>
                                <UrgencyBadge
                                    priorityLevel={post.priority_level}
                                    urgentUntil={post.urgent_until}
                                    isClosed={post.is_closed}
                                />
                            </div>
                        </div>

                        <h3 className="font-editorial text-3xl font-bold leading-tight mb-4 flex-grow break-words text-[var(--tn-text)]">
                            {post.title}
                        </h3>

                        <p className="text-[#67706c] text-[1.1rem] leading-relaxed mb-6">
                            {getExcerpt(post.content)}
                        </p>

                        <div className="mt-4 pt-4 border-t border-[var(--tn-outline)]/25 flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-2 text-[var(--tn-primary)] font-semibold">
                                <MessageSquare size={14} />
                                {responseCount} perspectiva{responseCount === 1 ? '' : 's'} compartida{responseCount === 1 ? '' : 's'}
                            </span>
                            <span className="text-[#91857f] italic">{timeAgo}</span>
                        </div>
                    </Link>
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
