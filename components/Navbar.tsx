import Link from 'next/link';
import { Plus, User, LogOut, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { signout } from '@/app/login/actions';

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
        <nav className="w-full sticky top-0 z-50 border-b border-[var(--tn-outline)]/35 bg-[var(--tn-bg)]/85 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
                <Link href="/" className="font-editorial text-2xl sm:text-4xl font-bold tracking-tight text-[var(--tn-primary)] hover:opacity-80 transition-opacity leading-none">
                    TENECESITO
                </Link>

                <div className="hidden lg:flex items-center gap-2">
                    <Link
                        href="/comunidad"
                        className="px-4 py-2 rounded-full text-sm font-semibold bg-[#f0ece7] border border-[var(--tn-outline)]/35 text-[var(--tn-text)] hover:bg-[#e7e2dc] transition-colors"
                    >
                        Comunidad
                    </Link>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 overflow-visible">
                    {user ? (
                        <>
                            <Link
                                href="/dashboard"
                                className="relative flex items-center justify-center w-10 h-10 rounded-full border border-[var(--tn-outline)]/40 bg-white/60 hover:bg-[var(--tn-surface-strong)] transition-colors"
                            >
                                <Bell size={18} strokeWidth={2.5} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[var(--tn-primary)] text-[10px] font-bold text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href="/create"
                                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold bg-[var(--tn-primary)] text-white px-3 py-2 rounded-full hover:opacity-90 transition-opacity"
                            >
                                <Plus size={16} strokeWidth={2.8} />
                                <span className="hidden sm:inline">Publicar</span>
                            </Link>

                            <div className="flex items-center gap-2 sm:pl-2">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border border-[var(--tn-outline)]/50 object-cover" />
                                ) : (
                                    <div className="w-10 h-10 flex items-center justify-center rounded-full border border-[var(--tn-outline)]/50 bg-[var(--tn-surface)] text-[var(--tn-primary)] font-bold uppercase text-base">
                                        {initialName}
                                    </div>
                                )}

                                <form action={signout}>
                                    <button title="Cerrar sesión" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2f2f2f] text-white hover:bg-[var(--tn-primary)] transition-colors">
                                        <LogOut size={16} strokeWidth={2.5} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold bg-[var(--tn-primary)] text-white px-3 py-2 rounded-full hover:opacity-90 transition-opacity"
                        >
                            <span className="hidden sm:inline">Acceder</span>
                            <User size={16} strokeWidth={2.5} />
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}