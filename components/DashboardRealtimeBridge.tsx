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
                console.log('[Dashboard RT] Ejecutando router.refresh()');
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
            (payload) => {
                console.log('[Dashboard RT] Evento posts recibido:', payload.eventType, payload.new);
                scheduleRefresh();
            },
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
                console.log('[Dashboard RT] Evento responses INSERT recibido:', payload.new);
                const postId = payload.new.post_id;
                const match = postIdsSetRef.current.has(postId);
                console.log(`[Dashboard RT] post_id=${postId} match=${match} postIds=[${[...postIdsSetRef.current].join(',')}]`);
                if (match) {
                    scheduleRefresh();
                }
            },
        );

        channel.subscribe((status, err) => {
            console.log('[Dashboard RT] Estado del canal:', status, err ?? '');
        });

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            void supabase.removeChannel(channel);
        };
    // postIds fuera del array: su contenido se lee via postIdsSetRef, estabilizando
    // el channel. userId y supabase son estables por definición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, supabase, userId]);

    return null;
}
