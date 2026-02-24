"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { CATEGORIES, MOCK_POSTS, MOCK_RESPONSES, CURRENT_USER_ID } from '@/lib/constants';

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [responseContent, setResponseContent] = useState('');

    const postId = params.id as string;
    const post = MOCK_POSTS.find(p => p.id === postId);

    if (!post) {
        return <div className="p-12 text-center font-black text-2xl uppercase">Publicación no encontrada</div>;
    }

    const cat = CATEGORIES.find(c => c.id === post.categoryId);
    const isAuthor = post.authorId === CURRENT_USER_ID;
    const hasResponded = MOCK_RESPONSES.some(r => r.postId === postId && r.authorId === CURRENT_USER_ID);
    const canRespond = !isAuthor && !hasResponded && !post.isClosed;

    const visibleResponses = isAuthor ? MOCK_RESPONSES.filter(r => r.postId === postId) : [];

    const handleRespond = () => {
        // Aquí irá la lógica hacia Supabase
        alert('MVP: Perspectiva lista para ser guardada');
        setResponseContent('');
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in duration-300">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold uppercase hover:underline mb-8">
                <ArrowLeft size={16} strokeWidth={3} /> Volver
            </button>

            {/* Post Original */}
            <div className={`border-4 border-black p-8 md:p-12 mb-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${cat?.bg}`}>
                <div className="flex items-center gap-3 mb-8">
                    <span className="bg-white border-2 border-black text-xs font-black uppercase px-4 py-2">
                        Necesidad en {cat?.name}
                    </span>
                    {post.isClosed && (
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

                {isAuthor && !post.isClosed && (
                    <div className="mt-8 flex justify-end">
                        <button className="bg-black text-white px-4 py-2 text-sm font-bold uppercase flex items-center gap-2 hover:bg-neutral-800 transition-colors">
                            <Lock size={16} /> Cerrar publicación
                        </button>
                    </div>
                )}
            </div>

            {/* ZONA INFERIOR */}
            {isAuthor && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black uppercase tracking-tighter border-b-4 border-black pb-4">
                        Perspectivas Recibidas ({visibleResponses.length})
                    </h3>

                    {visibleResponses.length === 0 && (
                        <p className="text-neutral-500 font-bold uppercase py-8">Aún no hay perspectivas para esta necesidad.</p>
                    )}

                    {visibleResponses.map((resp) => (
                        <div key={resp.id} className="bg-white p-8 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-left-4">
                            <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-4">
                                <span className="bg-black text-white px-3 py-1 text-xs font-black uppercase">
                                    Alguien aportó:
                                </span>
                                <span className="text-xs font-bold uppercase text-neutral-500 ml-auto">
                                    {new Date(resp.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-lg font-medium leading-relaxed break-words">
                                {resp.content}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {canRespond && (
                <div className="bg-white p-8 md:p-12 border-4 border-black border-dashed">
                    <h4 className="text-2xl font-black uppercase mb-2">Aporta tu perspectiva</h4>
                    <p className="font-bold uppercase text-neutral-500 text-sm mb-8">Solo tienes una oportunidad. Sé claro y útil.</p>

                    <textarea
                        placeholder="Escribe directamente lo que piensas..."
                        className="w-full p-6 bg-neutral-50 border-4 border-black min-h-[160px] resize-y text-lg focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all mb-6"
                        value={responseContent}
                        onChange={(e) => setResponseContent(e.target.value)}
                    />

                    <div className="flex justify-end">
                        <button
                            onClick={handleRespond}
                            disabled={responseContent.trim().length < 10}
                            className="px-8 py-4 bg-[#6BCB77] border-4 border-black text-black text-lg font-black uppercase hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
                        >
                            Enviar Perspectiva
                        </button>
                    </div>
                </div>
            )}

            {!isAuthor && hasResponded && (
                <div className="bg-[#4D96FF] text-black border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="text-3xl font-black uppercase tracking-tighter mb-4">¡Gracias!</h4>
                    <p className="text-lg font-bold uppercase">Ya has aportado tu perspectiva a esta necesidad.</p>
                </div>
            )}

            {!isAuthor && !hasResponded && post.isClosed && (
                <div className="bg-neutral-200 text-black border-4 border-black p-12 text-center">
                    <h4 className="text-3xl font-black uppercase tracking-tighter mb-4">Cerrada</h4>
                    <p className="text-lg font-bold uppercase">El autor ha decidido no recibir más perspectivas.</p>
                </div>
            )}
        </div>
    );
}