import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/constants';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { respondToPost, closePost } from './actions';
import LoadMoreResponses from '@/components/LoadMoreResponses';

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
        <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in duration-300">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase hover:underline mb-8">
                <ArrowLeft size={16} strokeWidth={3} /> Volver
            </Link>

            {/* Post Original */}
            <div className={`border-4 border-black p-8 md:p-12 mb-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${cat?.bg}`}>
                <div className="flex items-center gap-3 mb-8">
                    <span className="bg-white border-2 border-black text-xs font-black uppercase px-4 py-2">
                        Necesidad en {cat?.name}
                    </span>
                    {post.is_closed && (
                        <span className="flex items-center gap-1 text-xs font-black uppercase bg-black text-white px-4 py-2 ml-auto">
                            <Lock size={14} /> Cerrada
                        </span>
                    )}
                </div>

                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight mb-8 break-words">
                    {post.title}
                </h1>
                <div className="bg-white border-4 border-black p-6 md:p-8">
                    <p className="text-xl font-medium whitespace-pre-wrap leading-relaxed break-words">
                        {post.content}
                    </p>
                </div>

                {isAuthor && !post.is_closed && (
                    <div className="mt-8 flex justify-end">
                        <form action={closePost}>
                            <input type="hidden" name="postId" value={postId} />
                            <button className="bg-black text-white px-4 py-2 text-sm font-bold uppercase flex items-center gap-2 hover:bg-neutral-800 transition-colors">
                                <Lock size={16} /> Cerrar publicación
                            </button>
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
                <div className="bg-white p-8 md:p-12 border-4 border-black border-dashed">
                    <h4 className="text-2xl font-black uppercase mb-2">Aporta tu perspectiva</h4>
                    <p className="font-bold uppercase text-neutral-500 text-sm mb-8">Solo tienes una oportunidad. Sé claro y útil.</p>

                    <form action={respondToPost}>
                        <input type="hidden" name="postId" value={postId} />
                        <textarea
                            name="content"
                            required
                            minLength={10}
                            placeholder="Escribe directamente lo que piensas..."
                            className="w-full p-6 bg-neutral-50 border-4 border-black min-h-[160px] resize-y text-lg focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all mb-6"
                        />

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="px-8 py-4 bg-[#6BCB77] border-4 border-black text-black text-lg font-black uppercase hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
                            >
                                Enviar Perspectiva
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!user && !isAuthor && (
                <div className="bg-neutral-200 text-black border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="text-3xl font-black uppercase tracking-tighter mb-4">Inicia Sesión</h4>
                    <p className="text-lg font-bold uppercase">Debes iniciar sesión para dar tu perspectiva</p>
                </div>
            )}

            {!isAuthor && hasResponded && (
                <div className="bg-[#4D96FF] text-black border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="text-3xl font-black uppercase tracking-tighter mb-4">¡Gracias!</h4>
                    <p className="text-lg font-bold uppercase">Ya has aportado tu perspectiva a esta necesidad.</p>
                </div>
            )}

            {!isAuthor && !hasResponded && post.is_closed && (
                <div className="bg-neutral-200 text-black border-4 border-black p-12 text-center">
                    <h4 className="text-3xl font-black uppercase tracking-tighter mb-4">Cerrada</h4>
                    <p className="text-lg font-bold uppercase">El autor ha decidido no recibir más perspectivas.</p>
                </div>
            )}
        </div>
    );
}