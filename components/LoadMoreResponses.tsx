'use client';

import React, { useState } from 'react';
import { fetchPostResponses } from '@/app/post/[id]/actions';
import { Loader2, Plus } from 'lucide-react';

type ResponseItem = {
    id: string;
    content: string;
    created_at: string;
    is_read: boolean;
    author_id: string;
}

function formatResponseDate(dateInput: string) {
    const date = new Date(dateInput)
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

export default function LoadMoreResponses({
    postId,
    initialResponses,
    totalCount
}: {
    postId: string;
    initialResponses: ResponseItem[];
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
        <section className="mt-16">
            <div className="flex items-end justify-between mb-10">
                <div>
                    <h3 className="text-3xl font-bold text-[var(--tn-text)] leading-tight font-editorial">{totalCount} perspectivas recibidas</h3>
                    <p className="text-[var(--tn-muted)] mt-2">Tomate tu tiempo para procesar cada mirada.</p>
                </div>
            </div>

            <div className="space-y-6">
                {responses.map((response) => (
                    <div
                        key={response.id}
                        className={`${response.is_read ? 'bg-[#f5f3f1]/80 opacity-80' : 'bg-white border-l-4 border-[var(--tn-primary)] shadow-[0_12px_40px_rgba(27,28,27,0.06)]'} rounded-lg p-6 transition-all hover:translate-x-1`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold">
                                    {(response.author_id?.[0] || 'A').toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-[var(--tn-text)]">Voz de la comunidad</h4>
                                    <p className="text-xs text-[var(--tn-muted)]">Perspectiva compartida</p>
                                </div>
                            </div>
                            {response.is_read ? (
                                <div className="flex items-center gap-1 text-[#546258]">
                                    <span className="text-sm">●</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tight">Leido</span>
                                </div>
                            ) : (
                                <span className="bg-[color:rgba(145,70,46,0.1)] text-[var(--tn-primary)] px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                                    Nueva
                                </span>
                            )}
                        </div>
                        <p className={`${response.is_read ? 'italic' : ''} text-[var(--tn-muted)] line-height-editorial mb-6 whitespace-pre-wrap`}>{response.content}</p>
                        <div className="flex justify-between items-center border-t border-[var(--tn-outline)]/10 pt-4">
                            {response.is_read ? (
                                <span className="text-xs text-[var(--tn-muted)]/55 italic">
                                    Respondido el {formatResponseDate(response.created_at)}
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className="flex items-center gap-2 text-[var(--tn-muted)]/70 hover:text-[#546258] transition-colors"
                                    aria-label="Marcar como leido"
                                >
                                    <span className="text-base">○</span>
                                    <span className="text-sm font-medium">Marcar como leido</span>
                                </button>
                            )}
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
        </section>
    );
}
