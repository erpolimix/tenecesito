import Link from 'next/link';
import { Plus, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { signout } from '@/app/login/actions';
import NavbarUnreadCounter from './NavbarUnreadCounter';

export default async function Navbar() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let unreadCount = 0;
    if (user) {
        const { data: unreadResponses } = await supabase
            .from('responses')
            .select('id, posts!inner(author_id)')
            .eq('posts.author_id', user.id)
            .eq('is_read', false);
        
        if (unreadResponses) {
            unreadCount = unreadResponses.length;
        }
    }

    const avatarUrl = user?.user_metadata?.avatar_url;
    const initialName = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || '?';

    return (
        <nav className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
            <div className="max-w-7xl mx-auto rounded-[28px] px-4 py-3 md:px-8 md:py-4 tn-glass-nav">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
                    <div className="flex min-w-0 items-center justify-between gap-4 md:justify-start md:gap-8">
                        <Link href="/" className="font-editorial text-[1.9rem] sm:text-[2.2rem] md:text-[3.15rem] font-bold tracking-tight text-[var(--tn-primary)] hover:opacity-80 transition-opacity leading-none shrink min-w-0">
                            TENECESITO
                        </Link>

                        {!user && (
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors md:hidden"
                            >
                                <span>Entrar</span>
                                <User size={16} strokeWidth={2.5} />
                            </Link>
                        )}

                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-500">
                            <Link href="/feed" className="text-[var(--tn-primary)] border-b-2 border-[var(--tn-primary)] pb-1 transition-colors hover:text-[var(--tn-primary)]">
                                Explorar
                            </Link>
                            <Link
                                href="/comunidad"
                                className="transition-colors hover:text-[var(--tn-primary)]"
                            >
                                Comunidad
                            </Link>
                        </div>
                    </div>

                    {user ? (
                        <>
                        <div className="flex items-center justify-between gap-3 md:justify-end md:gap-3">
                            <div className="flex items-center gap-3">
                                <NavbarUnreadCounter initialCount={unreadCount} userId={user.id} />

                                <Link
                                    href="/create"
                                    className="hidden md:inline-flex items-center justify-center rounded-2xl bg-[#5d3d2e] text-white px-4 py-3 text-sm font-bold hover:bg-[#433422] active:scale-95 transition-all shadow-lg shadow-stone-200 md:px-6 md:gap-2"
                                >
                                    <Plus size={17} strokeWidth={2.8} />
                                    <span className="hidden md:inline">Nueva Necesidad</span>
                                </Link>
                            </div>

                            <div className="flex items-center gap-2 md:pl-2">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm md:h-11 md:w-11" />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#f4e7de] text-[var(--tn-primary)] font-bold uppercase text-base shadow-sm md:h-11 md:w-11">
                                        {initialName}
                                    </div>
                                )}

                                <form action={signout}>
                                    <button title="Cerrar sesión" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2f2f2f] text-white hover:bg-[var(--tn-primary)] transition-colors shadow-sm md:w-11 md:h-11">
                                        <LogOut size={16} strokeWidth={2.5} />
                                    </button>
                                </form>
                            </div>
                        </div>
                        <Link
                            href="/create"
                            aria-label="Crear nueva necesidad"
                            className="md:hidden fixed bottom-6 right-5 z-[60] flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#5d3d2e] text-white shadow-[0_10px_25px_rgba(93,61,46,0.3)] active:scale-95 transition-transform"
                        >
                            <Plus size={28} strokeWidth={2.5} />
                        </Link>
                        </>
                    ) : (
                        <>
                            <div className="hidden md:flex items-center gap-3 shrink-0">
                                <Link
                                    href="/login"
                                    className="text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-2"
                                >
                                    <span>Entrar</span>
                                </Link>
                            </div>
                            <Link
                                href="/login"
                                aria-label="Entrar para crear una necesidad"
                                className="md:hidden fixed bottom-6 right-5 z-[60] flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#5d3d2e] text-white shadow-[0_10px_25px_rgba(93,61,46,0.3)] active:scale-95 transition-transform"
                            >
                                <Plus size={28} strokeWidth={2.5} />
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}