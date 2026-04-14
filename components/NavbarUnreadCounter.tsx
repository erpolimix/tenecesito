'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NavbarUnreadCounter({ initialCount, userId }: { initialCount: number; userId: string }) {
    const [unreadCount, setUnreadCount] = useState(initialCount);
    const pathname = usePathname();
    const supabase = useMemo(() => createClient(), []);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeRequestRef = useRef(0);

    useEffect(() => {
        setUnreadCount(initialCount);
    }, [initialCount]);

    const recountUnread = useCallback(async () => {
        const requestId = activeRequestRef.current + 1;
        activeRequestRef.current = requestId;

        const { data: unreadResponses } = await supabase
            .from('responses')
            .select('id, posts!inner(author_id)')
            .eq('posts.author_id', userId)
            .eq('is_read', false);

        if (activeRequestRef.current !== requestId) return;
        setUnreadCount(unreadResponses?.length || 0);
    }, [supabase, userId]);

    const scheduleRecount = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            await recountUnread();
        }, 250);
    }, [recountUnread]);

    useEffect(() => {
        void recountUnread();
    }, [pathname, recountUnread]);

    useEffect(() => {
        const handleUnreadChanged = () => {
            void recountUnread();
        };

        window.addEventListener('tn:unread-responses-changed', handleUnreadChanged);

        return () => {
            window.removeEventListener('tn:unread-responses-changed', handleUnreadChanged);
        };
    }, [recountUnread]);

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
            className="relative flex items-center justify-center w-10 h-10 rounded-full border border-[#eadfd6] bg-[#fffaf6] text-[var(--tn-text)] hover:border-[#d4b7a7] hover:bg-white transition-colors"
        >
            <Bell size={18} strokeWidth={2.5} />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[var(--tn-primary)] text-[10px] font-bold text-white shadow-sm">
                    {unreadCount}
                </span>
            )}
        </Link>
    );
}
