'use client';

import React, { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { fetchPostResponses, markResponseFeedback } from '@/app/post/[id]/actions';
import { Loader2, Plus } from 'lucide-react';
import GamificationBadgeIcon, { type BadgeTone, type BadgeVariant } from '@/components/GamificationBadgeIcon';

type ResponseItem = {
    id: string;
    content: string;
    created_at: string;
    is_read: boolean;
    author_id: string;
    feedback_type?: 'util' | 'reveladora' | null;
    feedback_at?: string | null;
    author_total_points?: number;
    author_current_level?: string;
    author_streak_days?: number;
    author_active_badges?: string[];
    author_name?: string | null;
    author_avatar_url?: string | null;
}

function FeedbackActionButton({ label, tone }: Readonly<{ label: string; tone: 'util' | 'reveladora' }>) {
    const { pending } = useFormStatus();

    const className = tone === 'util'
        ? 'bg-[#e8f5e9] text-[#3e6f47] hover:bg-[#d9efdc]'
        : 'bg-[#fff3d9] text-[#8a6720] hover:bg-[#ffe8bc]';

    return (
        <button
            type="submit"
            disabled={pending}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${className}`}
        >
            {pending ? 'Guardando...' : label}
        </button>
    );
}

function formatBadgeLabel(key: string) {
    return key.replaceAll('_', ' ');
}

function toBadgeVisual(input: string): { variant: BadgeVariant; tone: BadgeTone; label: string } {
    const key = input.toLowerCase();

    if (key.includes('revel')) {
        return { variant: 'reveladora', tone: 'creatividad', label: 'Reveladora' };
    }

    if (key.includes('streak') || key.includes('racha')) {
        return { variant: 'racha', tone: 'decisiones', label: formatBadgeLabel(input) };
    }

    const hasCategoryMatch =
        key.includes('especial') ||
        key.includes('apoyo') ||
        key.includes('relaciones') ||
        key.includes('decisiones') ||
        key.includes('creatividad');

    let categoryTone: BadgeTone = 'neutral';
    if (key.includes('apoyo')) categoryTone = 'apoyo';
    if (key.includes('relaciones')) categoryTone = 'relaciones';
    if (key.includes('decisiones')) categoryTone = 'decisiones';
    if (key.includes('creatividad')) categoryTone = 'creatividad';

    if (hasCategoryMatch) {
        return { variant: 'especialista', tone: categoryTone, label: formatBadgeLabel(input) };
    }

    if (key.includes('nivel') || key.includes('guia') || key.includes('referente') || key.includes('sabio') || key.includes('faro')) {
        return { variant: 'nivel', tone: 'neutral', label: formatBadgeLabel(input) };
    }

    return { variant: 'especialista', tone: 'neutral', label: formatBadgeLabel(input) };
}

function levelTone(level: string | undefined): BadgeTone {
    const normalized = (level || '').toLowerCase();
    if (normalized.includes('faro')) return 'creatividad';
    if (normalized.includes('sabio')) return 'decisiones';
    if (normalized.includes('referente')) return 'relaciones';
    if (normalized.includes('guia')) return 'apoyo';
    return 'neutral';
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
}: Readonly<{
    postId: string;
    initialResponses: ResponseItem[];
    totalCount: number;
}>) {
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
                                {response.author_avatar_url ? (
                                    <img
                                        src={response.author_avatar_url}
                                        alt={`Avatar de ${response.author_name || 'usuario'}`}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold">
                                        {(response.author_name?.[0] || response.author_id?.[0] || 'A').toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-[var(--tn-text)]">{response.author_name || 'Voz de la comunidad'}</h4>
                                    <p className="text-xs text-[var(--tn-muted)]">
                                        {response.author_current_level || 'Semilla'} · {response.author_total_points || 0} pts
                                        {response.author_streak_days ? ` · racha ${response.author_streak_days}d` : ''}
                                    </p>
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
                        <div className="mb-4 flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#f3ece6] text-[#6d584f] text-[10px] font-black uppercase tracking-[0.12em]">
                                <GamificationBadgeIcon
                                    variant="nivel"
                                    tone={levelTone(response.author_current_level)}
                                    size={20}
                                    title={`Nivel ${response.author_current_level || 'Semilla'}`}
                                />
                                {response.author_current_level || 'Semilla'}
                            </span>

                            {(response.author_active_badges || []).map((badgeKey) => {
                                const visual = toBadgeVisual(badgeKey);
                                return (
                                    <span
                                        key={`${response.id}-${badgeKey}`}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#faf5f1] text-[#6d584f] text-[10px] font-black uppercase tracking-[0.12em]"
                                        title={visual.label}
                                    >
                                        <GamificationBadgeIcon
                                            variant={visual.variant}
                                            tone={visual.tone}
                                            size={20}
                                            title={visual.label}
                                        />
                                        {visual.label}
                                    </span>
                                );
                            })}
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
                            <div className="flex items-center gap-2">
                                {response.feedback_type ? (
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.12em] ${response.feedback_type === 'util' ? 'bg-[#def4e2] text-[#2f5e3b]' : 'bg-[#ffe8b8] text-[#7e5e18]'}`}>
                                        {response.feedback_type === 'util' ? 'Valorada: util' : 'Valorada: reveladora'}
                                    </span>
                                ) : (
                                    <>
                                        <form action={markResponseFeedback}>
                                            <input type="hidden" name="postId" value={postId} />
                                            <input type="hidden" name="responseId" value={response.id} />
                                            <input type="hidden" name="feedbackType" value="util" />
                                            <FeedbackActionButton label="Marcar util" tone="util" />
                                        </form>
                                        <form action={markResponseFeedback}>
                                            <input type="hidden" name="postId" value={postId} />
                                            <input type="hidden" name="responseId" value={response.id} />
                                            <input type="hidden" name="feedbackType" value="reveladora" />
                                            <FeedbackActionButton label="Marcar reveladora" tone="reveladora" />
                                        </form>
                                    </>
                                )}
                            </div>
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
