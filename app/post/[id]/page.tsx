import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/constants';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { respondToPost, closePost } from './actions';
import LoadMoreResponses from '@/components/LoadMoreResponses';
import PendingSubmitButton from '@/components/PendingSubmitButton';

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id: postId } = await params;
    const { data: { user } } = await supabase.auth.getUser();

    const { data: post } = await supabase.from('posts').select('*').eq('id', postId).single();

    if (!post) {
        return <div className="p-12 text-center font-black text-2xl uppercase">Publicación no encontrada</div>;
    }

    const cat = CATEGORIES.find(c => c.id === post.category_id);
    const isAuthor = user && post.author_id === user.id;

    if (isAuthor) {
        const { error: markReadError } = await supabase
            .from('responses')
            .update({ is_read: true })
            .eq('post_id', postId)
            .eq('is_read', false);

        if (markReadError) {
            console.error('Error marking responses as read on post detail', markReadError);
        }
    }

    let initialResponses = [];
    let totalResponsesCount = 0;
    if (isAuthor) {
        const { count } = await supabase.from('responses').select('*', { count: 'exact', head: true }).eq('post_id', postId);
        totalResponsesCount = count || 0;

        const { data: resps } = await supabase
            .from('responses')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .limit(10);
        initialResponses = resps || [];
    }

    let hasResponded = false;
    if (user && !isAuthor) {
        const { data: myResp } = await supabase.from('responses').select('id').eq('post_id', postId).eq('author_id', user.id).maybeSingle();
        if (myResp) hasResponded = true;
    }

    const canRespond = user && !isAuthor && !hasResponded && !post.is_closed;

    return (
        <div className="max-w-4xl mx-auto px-5 md:px-6 py-10 md:py-12 animate-in fade-in duration-300">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tn-muted)] hover:text-[var(--tn-primary)] transition-colors mb-8">
                <ArrowLeft size={16} strokeWidth={2.5} /> Volver
            </Link>

            {/* Post Original */}
            <div className="bg-white/85 border border-[var(--tn-outline)]/35 rounded-[30px] p-6 md:p-10 mb-12 shadow-[0_14px_36px_rgba(27,28,27,0.09)]">
                <div className="flex items-center gap-3 mb-8">
                    <span className={`text-xs font-semibold uppercase tracking-[0.14em] px-4 py-2 rounded-full border border-black/10 ${cat?.softBg || 'bg-[#ece7e2]'} ${cat?.softText || 'text-[#5c524d]'}`}>
                        Necesidad en {cat?.name}
                    </span>
                    {post.is_closed && (
                        <span className="flex items-center gap-1 text-xs font-semibold uppercase bg-[#4a4a4a] text-white px-4 py-2 rounded-full ml-auto">
                            <Lock size={14} /> Cerrada
                        </span>
                    )}
                </div>

                <h1 className="font-editorial text-4xl md:text-6xl font-bold tracking-tight leading-[0.96] mb-8 break-words text-[var(--tn-primary)]">
                    {post.title}
                </h1>
                <div className="bg-white border border-[var(--tn-outline)]/30 rounded-2xl p-6 md:p-8">
                    <p className="text-lg md:text-xl whitespace-pre-wrap leading-relaxed break-words">
                        {post.content}
                    </p>
                </div>

                {isAuthor && !post.is_closed && (
                    <div className="mt-8 flex justify-end">
                        <form action={closePost}>
                            <input type="hidden" name="postId" value={postId} />
                            <PendingSubmitButton
                                pendingText="Cerrando..."
                                className="bg-[var(--tn-primary)] text-white px-5 py-2.5 text-sm font-semibold uppercase rounded-full inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                            >
                                <Lock size={16} /> Cerrar publicación
                            </PendingSubmitButton>
                        </form>
                    </div>
                )}
            </div>

            {/* ZONA INFERIOR */}
            {isAuthor && (
                <LoadMoreResponses
                    postId={postId}
                    initialResponses={initialResponses}
                    totalCount={totalResponsesCount}
                />
            )}

            {canRespond && (
                <div className="bg-white/80 p-6 md:p-10 border border-[var(--tn-outline)]/35 rounded-[28px]">
                    <h4 className="font-editorial text-4xl text-[var(--tn-primary)] mb-2">Aporta tu perspectiva</h4>
                    <p className="font-semibold text-[var(--tn-muted)] text-sm mb-8">Solo tienes una oportunidad. Sé claro y útil.</p>

                    <form action={respondToPost}>
                        <input type="hidden" name="postId" value={postId} />
                        <textarea
                            name="content"
                            required
                            minLength={10}
                            placeholder="Escribe directamente lo que piensas..."
                            className="w-full p-6 bg-white border border-[var(--tn-outline)]/35 rounded-2xl min-h-[160px] resize-y text-lg focus:outline-none focus:border-[var(--tn-primary)] transition-colors mb-6"
                        />

                        <div className="flex justify-end">
                            <PendingSubmitButton
                                pendingText="Enviando..."
                                className="px-8 py-4 bg-[var(--tn-primary)] text-white text-base font-semibold rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                Enviar Respuesta
                            </PendingSubmitButton>
                        </div>
                    </form>
                </div>
            )}

            {!isAuthor && post.is_closed && (
                <div className="bg-[var(--tn-surface)] border border-[var(--tn-outline)]/35 rounded-3xl p-12 text-center">
                    <h4 className="font-editorial text-4xl tracking-tight mb-4 text-[var(--tn-primary)]">Cerrada</h4>
                    <p className="text-lg text-[var(--tn-muted)]">El autor ha decidido no recibir más perspectivas.</p>
                </div>
            )}

            {!user && !isAuthor && !post.is_closed && (
                <div className="bg-white/75 border border-[var(--tn-outline)]/35 rounded-3xl p-12 text-center">
                    <h4 className="font-editorial text-4xl text-[var(--tn-primary)] tracking-tight mb-4">Inicia Sesión</h4>
                    <p className="text-lg text-[var(--tn-muted)]">Debes iniciar sesión para dar tu perspectiva.</p>
                </div>
            )}

            {!isAuthor && hasResponded && !post.is_closed && (
                <div className="bg-[#d7e8ff] border border-[#bfd5f8] rounded-3xl p-12 text-center">
                    <h4 className="font-editorial text-4xl tracking-tight mb-4 text-[#2a4f87]">Gracias</h4>
                    <p className="text-lg text-[#375783]">Ya has aportado tu perspectiva a esta necesidad.</p>
                </div>
            )}
        </div>
    );
}