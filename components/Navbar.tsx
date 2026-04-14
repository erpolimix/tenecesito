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
        <nav className="w-full sticky top-0 z-50 border-b border-[#f1e4db] bg-white/92 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-6 md:gap-8 min-w-0">
                <Link href="/" className="font-editorial text-[2rem] sm:text-[2.5rem] font-bold tracking-tight text-[var(--tn-primary)] hover:opacity-80 transition-opacity leading-none shrink-0">
                    TENECESITO
                </Link>

                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-500">
                    <Link href="/feed" className="text-[var(--tn-primary)] transition-colors hover:text-[var(--tn-primary)]">
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

                <div className="flex items-center gap-2 sm:gap-3 overflow-visible shrink-0">
                    {user ? (
                        <>
                            {user && <NavbarUnreadCounter initialCount={unreadCount} userId={user.id} />}

                            <Link
                                href="/create"
                                className="tn-button-primary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold px-4 sm:px-6 py-2.5 rounded-full shadow-sm"
                            >
                                <Plus size={16} strokeWidth={2.8} />
                                <span className="hidden sm:inline">Publicar Necesidad</span>
                            </Link>

                            <div className="flex items-center gap-2 sm:pl-2">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-white bg-[#f4e7de] text-[var(--tn-primary)] font-bold uppercase text-base shadow-sm">
                                        {initialName}
                                    </div>
                                )}

                                <form action={signout}>
                                    <button title="Cerrar sesión" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2f2f2f] text-white hover:bg-[var(--tn-primary)] transition-colors shadow-sm">
                                        <LogOut size={16} strokeWidth={2.5} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="tn-button-primary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold px-4 sm:px-6 py-2.5 rounded-full shadow-sm"
                        >
                            <span>Entrar</span>
                            <User size={16} strokeWidth={2.5} />
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}