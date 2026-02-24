"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

export default function CreatePage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0].id);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Aquí irá la Server Action de Supabase más adelante.
        alert('MVP: Datos listos para guardar en DB');
        router.push(`/feed?category=${category}`);
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-12 animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold uppercase hover:underline mb-8">
                <ArrowLeft size={16} strokeWidth={3} /> Volver
            </button>

            <div className="bg-white border-4 border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-8 break-words">Nueva Necesidad</h2>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-sm font-black uppercase mb-3">Área</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategory(cat.id)}
                                    className={`py-3 px-2 text-sm font-black uppercase border-2 border-black transition-all ${category === cat.id
                                            ? `${cat.bg} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]`
                                            : 'bg-white hover:bg-neutral-100'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-black uppercase mb-3 flex justify-between">
                            <span>Título</span>
                            <span className="text-neutral-400">{title.length}/120</span>
                        </label>
                        <input
                            type="text"
                            maxLength={120}
                            required
                            placeholder="Resume tu situación en una frase"
                            className="w-full p-4 bg-neutral-50 border-4 border-black text-xl font-bold focus:outline-none focus:bg-[#FFD93D]/20 transition-colors"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-black uppercase mb-3">Contexto Completo</label>
                        <textarea
                            required
                            minLength={20}
                            placeholder="Explica los detalles. Todo es 100% anónimo."
                            className="w-full p-4 bg-neutral-50 border-4 border-black min-h-[200px] resize-y text-lg focus:outline-none focus:bg-[#FFD93D]/20 transition-colors"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="pt-8 border-t-4 border-black flex justify-end">
                        <button
                            type="submit"
                            disabled={title.length === 0 || content.length < 20}
                            className="px-8 py-4 bg-black text-white text-lg font-black uppercase hover:bg-neutral-800 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(255,217,61,1)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all"
                        >
                            Publicar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}