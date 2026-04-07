'use client';

import React, { useState } from 'react';
import { fetchPostResponses } from '@/app/post/[id]/actions';
import { Loader2, Plus } from 'lucide-react';

export default function LoadMoreResponses({ 
    postId, 
    initialResponses, 
    totalCount 
}: { 
    postId: string; 
    initialResponses: any[]; 
    totalCount: number;
}) {
    const [responses, setResponses] = useState(initialResponses);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(10);
    const [hasMore, setHasMore] = useState(totalCount > initialResponses.length);

    const handleLoadMore = async () => {
        setLoading(true);
        const nextResponses = await fetchPostResponses(postId, 10, offset);
        
        if (nextResponses.length === 0) {
            setHasMore(false);
        } else {
            setResponses(prev => [...prev, ...nextResponses]);
            setOffset(prev => prev + 10);
            if (responses.length + nextResponses.length >= totalCount) {
                setHasMore(false);
            }
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 mt-12">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-8">
                {totalCount} Perspectivas
            </h2>

            <div className="space-y-6">
                {responses.map((response) => (
                    <div 
                        key={response.id} 
                        className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                    >
                        <p className="text-xl leading-relaxed font-medium">{response.content}</p>
                        <div className="mt-4 pt-4 border-t-2 border-black flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-neutral-400">
                                {new Date(response.created_at).toLocaleDateString('es-ES', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && (
                <div className="pt-8 text-center">
                    <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="bg-white border-4 border-black px-8 py-3 font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-[#FFD93D] transition-all flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 size={24} className="animate-spin text-black" />
                        ) : (
                            <>
                                <Plus size={24} strokeWidth={3} />
                                Cargar más perspectivas
                            </>
                        )}
                    </button>
                    <p className="mt-4 text-xs font-bold uppercase text-neutral-400">
                        Mostrando {responses.length} de {totalCount} recibidas
                    </p>
                </div>
            )}
        </div>
    );
}
