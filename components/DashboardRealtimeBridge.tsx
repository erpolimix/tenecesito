'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardRealtimeBridge({
    userId,
    postIds,
}: {
    userId: string;
    postIds: string[];
}) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref estable para evitar que postIds (nuevo array en cada render) force
    // reconectar el channel tras cada router.refresh().
    const postIdsSetRef = useRef(new Set(postIds));

    useEffect(() => {
        postIdsSetRef.current = new Set(postIds);
    }, [postIds]);

    useEffect(() => {
        const scheduleRefresh = () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }

            refreshTimerRef.current = setTimeout(() => {
                router.refresh();
            }, 250);
        };

        const channel = supabase.channel(`dashboard-live:${userId}`);

        channel.on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'posts',
                filter: `author_id=eq.${userId}`,
            },
            scheduleRefresh,
        );

        // Sin filter server-side porque Supabase Realtime no soporta `in`.
        // Filtramos en el callback. Solo INSERT para evitar bucle con is_read.
        channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'responses',
            },
            (payload) => {
                const postId = payload.new.post_id;
                const match = postIdsSetRef.current.has(postId);
                if (match) {
                    scheduleRefresh();
                }
            },        
        );

        channel.subscribe();

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            void supabase.removeChannel(channel);
        };
    }, [router, supabase, userId]);

    return null;
}
