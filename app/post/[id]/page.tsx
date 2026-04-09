import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/constants';
import Link from 'next/link';
import { ArrowLeft, Lock, Edit3 } from 'lucide-react';
import { respondToPost, closePost } from './actions';
import LoadMoreResponses from '@/components/LoadMoreResponses';
import PendingSubmitButton from '@/components/PendingSubmitButton';

function getTimeAgoEs(dateInput: string) {
    const now = new Date();
    const date = new Date(dateInput);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMins < 60) return `Publicado hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Publicado hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Publicado hace ${diffDays} d`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `Publicado hace ${diffWeeks} sem`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `Publicado hace ${diffMonths} mes${diffMonths === 1 ? '' : 'es'}`;
    const diffYears = Math.floor(diffDays / 365);
    return `Publicado hace ${diffYears} año${diffYears === 1 ? '' : 's'}`;
}

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
    const realTags = Array.isArray(post.tags)
        ? post.tags
            .map((tag: unknown) => String(tag).trim().replace(/^#+/, '').replace(/\s+/g, ''))
            .filter((tag: string) => tag.length > 0)
            .slice(0, 8)
        : [];
    const tagsToDisplay = realTags.length > 0
        ? realTags
        : [cat?.name?.replace(/\s+/g, '') || 'comunidad'];

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
        <>
        <main className="max-w-4xl mx-auto px-6 py-8 pb-32 animate-in fade-in duration-300">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tn-muted)] hover:text-[var(--tn-primary)] transition-colors mb-8">
                <ArrowLeft size={16} strokeWidth={2.5} /> Volver
            </Link>

            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${post.is_closed ? 'bg-[#e7dfd5] text-[#6d5a52]' : 'bg-[#d5e3d7] text-[#425649]'}`}>
                        <span className={`w-2 h-2 rounded-full ${post.is_closed ? 'bg-[#6d5a52]' : 'bg-[#5f7a67]'}`} />
                        {post.is_closed ? 'Cerrada' : 'Abierto'}
                    </span>
                    <span className="text-[var(--tn-muted)] text-sm font-medium">{getTimeAgoEs(post.created_at)}</span>
                </div>

                <div className="bg-[#f5f3f1] rounded-xl p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[color:rgba(145,70,46,0.08)] rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-5xl font-bold text-[var(--tn-text)] leading-[1.1] tracking-tight mb-8 font-editorial break-words">
                            {post.title}
                        </h2>
                        <p className="text-lg md:text-xl text-[var(--tn-muted)] line-height-editorial max-w-2xl whitespace-pre-wrap break-words">
                            {post.content}
                        </p>
                        <div className="mt-10 flex flex-wrap gap-2">
                            {tagsToDisplay.map((tag: string) => (
                                <span key={tag} className="bg-[#e3e2e0] px-4 py-2 rounded-lg text-sm text-[#54433e] font-medium">#{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {isAuthor && (
                <LoadMoreResponses
                    postId={postId}
                    initialResponses={initialResponses}
                    totalCount={totalResponsesCount}
                />
            )}

            {canRespond && (
                <div className="bg-white/80 p-6 md:p-10 border border-[var(--tn-outline)]/35 rounded-[28px] mt-16">
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
        </main>

        {isAuthor && !post.is_closed && (
            <div className="fixed bottom-0 left-0 w-full p-6 flex justify-center pointer-events-none z-50">
                <div className="bg-[color:rgba(255,255,255,0.8)] backdrop-blur-2xl px-6 py-4 rounded-full shadow-[0_-12px_40px_rgba(27,28,27,0.08)] flex items-center gap-4 pointer-events-auto border border-[var(--tn-outline)]/10">
                    <form action={closePost}>
                        <input type="hidden" name="postId" value={postId} />
                        <PendingSubmitButton
                            pendingText="Cerrando..."
                            className="flex items-center gap-2 bg-[#f4d6d3] text-[#8e332c] hover:bg-[#eaa39b] hover:text-white transition-all px-8 py-3 rounded-full active:scale-95 duration-200 font-bold text-sm tracking-tight"
                        >
                            <Lock size={16} />
                            Cerrar publicación
                        </PendingSubmitButton>
                    </form>

                    <div className="h-6 w-px bg-[var(--tn-outline)]/30" />

                    <Link
                        href={`/post/${postId}/edit`}
                        className="p-3 bg-[#e3e2e0] text-[#54433e] rounded-full hover:bg-[var(--tn-primary)] hover:text-white transition-all"
                        aria-label="Editar publicación"
                    >
                        <Edit3 size={18} />
                    </Link>
                </div>
            </div>
        )}
        </>
    );
}