"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, MessageSquare } from 'lucide-react';
import { CATEGORIES, MOCK_POSTS, MOCK_RESPONSES, CURRENT_USER_ID } from '@/lib/constants';

function FeedContent() {
    const searchParams = useSearchParams();
    const categoryId = searchParams.get('category');

    const filteredPosts = categoryId
        ? MOCK_POSTS.filter(p => p.categoryId === categoryId)
        : MOCK_POSTS;

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
                    {filteredPosts.length === 0 ? (
                        <div className="col-span-full text-center py-20 border-4 border-black border-dashed bg-neutral-50">
                            <p className="text-2xl font-bold uppercase text-neutral-400">Aún no hay publicaciones aquí.</p>
                        </div>
                    ) : (
                        filteredPosts.map(post => {
                            const cat = CATEGORIES.find(c => c.id === post.categoryId);
                            const isAuthor = post.authorId === CURRENT_USER_ID;
                            const responseCount = MOCK_RESPONSES.filter(r => r.postId === post.id).length;

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
                                        {post.isClosed && (
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
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default function FeedPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center font-black text-2xl uppercase">Cargando...</div>}>
            <FeedContent />
        </Suspense>
    );
}