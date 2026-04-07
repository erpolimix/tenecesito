'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Lock, MessageSquare, Loader2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { useInView } from 'react-intersection-observer';
import { fetchFeedPosts } from '@/app/feed/actions';

export default function InfinitePostList({ 
    initialPosts, 
    categoryId,
    currentUserId 
}: { 
    initialPosts: any[], 
    categoryId?: string,
    currentUserId?: string 
}) {
    const [posts, setPosts] = useState(initialPosts);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialPosts.length >= 9);
    const [ref, inView] = useInView();

    const loadMore = useCallback(async () => {
        if (!hasMore) return;
        
        const nextOffset = page * 9;
        const newPosts = await fetchFeedPosts(9, nextOffset, categoryId);
        
        if (newPosts.length === 0) {
            setHasMore(false);
        } else {
            setPosts((prev) => [...prev, ...newPosts]);
            setPage((prev) => prev + 1);
            if (newPosts.length < 9) {
                setHasMore(false);
            }
        }
    }, [page, hasMore, categoryId]);

    useEffect(() => {
        if (inView && hasMore) {
            loadMore();
        }
    }, [inView, hasMore, loadMore]);

    if (posts.length === 0) {
        return (
            <div className="col-span-full text-center py-20 border-4 border-black border-dashed bg-neutral-50">
                <p className="text-2xl font-bold uppercase text-neutral-400">Aún no hay publicaciones aquí.</p>
            </div>
        );
    }

    return (
        <>
            {posts.map(post => {
                const cat = CATEGORIES.find(c => c.id === post.category_id);
                const isAuthor = currentUserId && post.author_id === currentUserId;
                const responseCount = post.responses?.[0]?.count || 0;

                return (
                    <Link
                        href={`/post/${post.id}`}
                        key={post.id}
                        className="bg-white border-4 border-black p-6 cursor-pointer hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col h-full"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <span className={`text-xs font-black uppercase px-3 py-1 border-2 border-black ${cat?.bg}`}>
                                {cat?.name}
                            </span>
                            {post.is_closed && (
                                <span className="flex items-center gap-1 text-xs font-bold uppercase bg-black text-white px-2 py-1">
                                    <Lock size={12} /> Cerrada
                                </span>
                            )}
                        </div>

                        <h3 className="text-2xl font-black leading-tight mb-4 flex-grow break-words">
                            {post.title}
                        </h3>

                        <div className="mt-4 pt-4 border-t-4 border-black flex items-center justify-between text-sm font-bold uppercase">
                            <span className="text-neutral-500">Alguien necesita perspectiva</span>
                            {isAuthor && (
                                <span className="flex items-center gap-1 bg-[#FFD93D] px-2 py-1 border-2 border-black">
                                    <MessageSquare size={14} /> {responseCount}
                                </span>
                            )}
                        </div>
                    </Link>
                );
            })}
            
            {hasMore && (
                <div ref={ref} className="col-span-full py-10 flex justify-center items-center">
                    <Loader2 className="animate-spin text-neutral-400" size={32} />
                </div>
            )}
            
            {!hasMore && posts.length > 0 && (
                <div className="col-span-full text-center py-10">
                    <p className="text-sm font-bold uppercase text-neutral-400">Has llegado al final</p>
                </div>
            )}
        </>
    );
}
