'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PostRealtimeBridge({ postId }: { postId: string }) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const scheduleRefresh = () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }

            refreshTimerRef.current = setTimeout(() => {
                router.refresh();
            }, 250);
        };

        const channel = supabase
            .channel(`post-live:${postId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'posts',
                    filter: `id=eq.${postId}`,
                },
                scheduleRefresh,
            )
            .on(
                'postgres_changes',
                {
                    // Solo INSERT: evita bucle infinito con el UPDATE de is_read
                    // que el propio Server Component ejecuta al renderizar.
                    event: 'INSERT',
                    schema: 'public',
                    table: 'responses',
                    filter: `post_id=eq.${postId}`,
                },
                scheduleRefresh,
            )
            .subscribe();

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            void supabase.removeChannel(channel);
        };
    }, [postId, router, supabase]);

    return null;
}
