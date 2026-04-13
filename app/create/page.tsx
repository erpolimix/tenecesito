"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { NORMAL_PRIORITY, URGENT_PRIORITY } from '@/lib/urgency';
import { createPost } from './actions';
import PendingSubmitButton from '@/components/PendingSubmitButton';

export default function CreatePage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0].id);
    const [tags, setTags] = useState('');
    const [priorityLevel, setPriorityLevel] = useState(NORMAL_PRIORITY);
    const [submitError, setSubmitError] = useState('');

    const handleSubmit = async (formData: FormData) => {
        setSubmitError('');
        formData.append('categoryId', category);
        formData.append('priorityLevel', priorityLevel);
        const result = await createPost(formData);

        if (!result.ok) {
            setSubmitError(result.error || 'No se pudo crear la necesidad');
            return;
        }

        router.push('/feed');
        router.refresh();
    };

    return (
        <div className="max-w-3xl mx-auto px-5 py-10 md:py-12 animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-[var(--tn-muted)] hover:text-[var(--tn-primary)] transition-colors mb-8">
                <ArrowLeft size={16} strokeWidth={2.5} /> Volver
            </button>

            <div className="bg-white/80 border border-[var(--tn-outline)]/35 rounded-[32px] p-6 md:p-10 shadow-[0_18px_45px_rgba(27,28,27,0.09)]">
                <span className="inline-flex px-4 py-1 rounded-full bg-[var(--tn-surface)] text-[var(--tn-muted)] text-xs font-semibold uppercase tracking-[0.18em] mb-5">Nuevo Registro</span>
                <h2 className="font-editorial text-5xl md:text-6xl font-bold tracking-tight leading-[0.95] mb-4 break-words text-[var(--tn-primary)]">
                    Comparte lo que
                    <span className="italic text-[var(--tn-primary-soft)]"> estás sintiendo.</span>
                </h2>
                <p className="text-[var(--tn-muted)] mb-8 max-w-xl">
                    Este espacio es para expresarte con claridad y recibir perspectivas de la comunidad.
                </p>

                <form action={handleSubmit} className="space-y-8">
                    {submitError && (
                        <div className="rounded-2xl border border-[#f1c7bb] bg-[#fff2ed] px-4 py-3 text-sm text-[#8f2f18]" role="alert">
                            {submitError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold uppercase tracking-[0.16em] text-[var(--tn-muted)] mb-3">Categoría</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategory(cat.id)}
                                    className={`py-3 px-2 text-sm font-semibold uppercase rounded-full border transition-all ${category === cat.id
                                            ? `${cat.softBg} ${cat.softText} border-black/10 shadow-[0_8px_18px_rgba(27,28,27,0.12)]`
                                            : `${cat.softBg} ${cat.softText} border-transparent opacity-75 hover:opacity-100`
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold uppercase tracking-[0.16em] text-[var(--tn-muted)] mb-3 flex justify-between">
                            <span>Título</span>
                            <span className="text-[var(--tn-outline)]">{title.length}/120</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            maxLength={120}
                            required
                            placeholder="Resume tu situación en una frase"
                            className="w-full p-4 bg-white border border-[var(--tn-outline)]/35 rounded-2xl text-lg font-semibold focus:outline-none focus:border-[var(--tn-primary)] transition-colors"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold uppercase tracking-[0.16em] text-[var(--tn-muted)] mb-3">Cuéntanos con detalle</label>
                        <textarea
                            name="content"
                            required
                            minLength={20}
                            placeholder="Explica los detalles. Todo es 100% anónimo."
                            className="w-full p-4 bg-white border border-[var(--tn-outline)]/35 rounded-2xl min-h-[200px] resize-y text-lg focus:outline-none focus:border-[var(--tn-primary)] transition-colors"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold uppercase tracking-[0.16em] text-[var(--tn-muted)] mb-3 flex justify-between">
                            <span>Tags</span>
                            <span className="text-[var(--tn-outline)]">Hasta 8, separados por coma</span>
                        </label>
                        <input
                            type="text"
                            name="tags"
                            placeholder="#duelo, #carrera, #transicion"
                            className="w-full p-4 bg-white border border-[var(--tn-outline)]/35 rounded-2xl text-base focus:outline-none focus:border-[var(--tn-primary)] transition-colors"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                        />
                        <p className="mt-2 text-xs text-[var(--tn-muted)]">Puedes escribirlos con o sin #. Se limpiarán automáticamente al guardar.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold uppercase tracking-[0.16em] text-[var(--tn-muted)] mb-3">Prioridad</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPriorityLevel(NORMAL_PRIORITY)}
                                className={`rounded-[24px] border p-4 text-left transition-all ${priorityLevel === NORMAL_PRIORITY ? 'border-[var(--tn-primary)] bg-white shadow-[0_10px_24px_rgba(27,28,27,0.08)]' : 'border-[var(--tn-outline)]/25 bg-[var(--tn-surface)]/75 hover:bg-white'}`}
                            >
                                <span className="block text-sm font-semibold text-[var(--tn-text)]">Normal</span>
                                <span className="mt-1 block text-sm text-[var(--tn-muted)]">Se mostrará en el feed general de la comunidad.</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriorityLevel(URGENT_PRIORITY)}
                                className={`rounded-[24px] border p-4 text-left transition-all ${priorityLevel === URGENT_PRIORITY ? 'border-[#a13d21] bg-[#ffede7] shadow-[0_10px_24px_rgba(145,70,46,0.12)]' : 'border-[#f1c7bb] bg-[#fff6f2] hover:bg-[#ffede7]'}`}
                            >
                                <span className="block text-sm font-semibold text-[#8f2f18]">Urgente 24h</span>
                                <span className="mt-1 block text-sm text-[#8f5a4e]">Prioriza tu necesidad durante 24 horas. Solo puedes crear una urgente cada 24 horas.</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 p-5 rounded-2xl bg-[var(--tn-surface)] border border-[var(--tn-outline)]/20">
                        <p className="text-sm text-[var(--tn-muted)]">
                            Tu publicación puede mantenerse anónima. Moderamos para mantener un espacio seguro.
                        </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <PendingSubmitButton
                            pendingText="Publicando..."
                            disabled={title.length === 0 || content.length < 20}
                            className="px-8 py-4 bg-[var(--tn-primary)] text-white text-base font-semibold rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            Compartir mi situación
                        </PendingSubmitButton>
                    </div>
                </form>
            </div>
        </div>
    );
}