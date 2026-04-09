import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/constants'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { updatePost } from '../actions'
import PendingSubmitButton from '@/components/PendingSubmitButton'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id: postId } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()

    if (error || !post) {
        redirect('/dashboard')
    }

    if (post.author_id !== user.id) {
        redirect(`/post/${postId}`)
    }

    return (
        <main className="max-w-3xl mx-auto px-5 py-10 md:py-12 animate-in fade-in duration-300">
            <Link href={`/post/${postId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tn-muted)] hover:text-[var(--tn-primary)] transition-colors mb-8">
                <ArrowLeft size={16} strokeWidth={2.5} /> Volver al detalle
            </Link>

            <div className="bg-white/85 border border-[var(--tn-outline)]/35 rounded-[30px] p-6 md:p-10 shadow-[0_14px_36px_rgba(27,28,27,0.09)]">
                <h1 className="font-editorial text-4xl md:text-5xl text-[var(--tn-primary)] mb-3">Editar publicación</h1>
                <p className="text-[var(--tn-muted)] mb-8">Actualiza tu necesidad y guarda los cambios para la comunidad.</p>

                {post.is_closed ? (
                    <div className="rounded-2xl border border-[var(--tn-outline)]/25 bg-[var(--tn-surface)] p-6 text-[var(--tn-muted)]">
                        Esta publicación está cerrada. Por ahora no se puede editar.
                    </div>
                ) : (
                    <form action={updatePost} className="space-y-7">
                        <input type="hidden" name="postId" value={postId} />

                        <div>
                            <label className="block text-sm font-semibold uppercase tracking-[0.16em] text-[var(--tn-muted)] mb-3">Categoría</label>
                            <select
                                name="categoryId"
                                defaultValue={post.category_id}
                                className="w-full p-4 bg-white border border-[var(--tn-outline)]/35 rounded-2xl text-base focus:outline-none focus:border-[var(--tn-primary)] transition-colors"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold uppercase tracking-[0.16em] text-[var(--tn-muted)] mb-3">Título</label>
                            <input
                                type="text"
                                name="title"
                                defaultValue={post.title}
                                required
                                minLength={8}
                                maxLength={120}
                                className="w-full p-4 bg-white border border-[var(--tn-outline)]/35 rounded-2xl text-lg font-semibold focus:outline-none focus:border-[var(--tn-primary)] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold uppercase tracking-[0.16em] text-[var(--tn-muted)] mb-3">Contenido</label>
                            <textarea
                                name="content"
                                defaultValue={post.content}
                                required
                                minLength={20}
                                className="w-full p-4 bg-white border border-[var(--tn-outline)]/35 rounded-2xl min-h-[220px] resize-y text-lg focus:outline-none focus:border-[var(--tn-primary)] transition-colors"
                            />
                        </div>

                        <div className="pt-2 flex justify-end">
                            <PendingSubmitButton
                                pendingText="Guardando..."
                                className="px-8 py-4 bg-[var(--tn-primary)] text-white text-base font-semibold rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                Guardar cambios
                            </PendingSubmitButton>
                        </div>
                    </form>
                )}
            </div>
        </main>
    )
}
