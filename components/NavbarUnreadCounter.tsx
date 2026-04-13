'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function NavbarUnreadCounter({ initialCount, userId }: { initialCount: number; userId: string }) {
    const [unreadCount, setUnreadCount] = useState(initialCount);
    const supabase = useMemo(() => createClient(), []);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countRef = useRef(initialCount);

    useEffect(() => {
        countRef.current = unreadCount;
    }, [unreadCount]);

    const scheduleRecount = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            const { data: unreadResponses } = await supabase
                .from('responses')
                .select('id, posts!inner(author_id)')
                .eq('posts.author_id', userId)
                .eq('is_read', false);

            setUnreadCount(unreadResponses?.length || 0);
        }, 250);
    }, [supabase, userId]);

    useEffect(() => {
        const channel = supabase.channel(`navbar-unread:${userId}`);

        channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'responses',
            },
            scheduleRecount,
        );

        channel.on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'responses',
                filter: `is_read=eq.false`,
            },
            scheduleRecount,
        );

        channel.subscribe();

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            void supabase.removeChannel(channel);
        };
    }, [supabase, userId, scheduleRecount]);

    return (
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
    );
}
