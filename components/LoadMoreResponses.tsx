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
            <h2 className="font-editorial text-4xl md:text-5xl font-bold tracking-tight mb-8 text-[var(--tn-primary)]">
                {totalCount} Perspectivas
            </h2>

            <div className="space-y-6">
                {responses.map((response) => (
                    <div
                        key={response.id}
                        className="bg-white border border-[var(--tn-outline)]/30 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[0_12px_26px_rgba(27,28,27,0.1)] transition-all"
                    >
                        <p className="text-lg leading-relaxed">{response.content}</p>
                        <div className="mt-4 pt-4 border-t border-[var(--tn-outline)]/25 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-[0.14em] text-[var(--tn-muted)]">
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
                        className="bg-white border border-[var(--tn-outline)]/35 px-8 py-3 font-semibold uppercase rounded-full hover:bg-[var(--tn-surface)] transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 size={22} className="animate-spin text-[var(--tn-primary)]" />
                        ) : (
                            <>
                                <Plus size={22} strokeWidth={2.5} />
                                Cargar más elementos
                            </>
                        )}
                    </button>
                    <p className="mt-4 text-xs text-[var(--tn-muted)]">
                        Mostrando {responses.length} de {totalCount} recibidas
                    </p>
                </div>
            )}
        </div>
    );
}
