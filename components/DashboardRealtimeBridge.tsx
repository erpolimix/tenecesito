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

        if (postIds.length > 0) {
            const idList = postIds.join(',');
            channel.on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'responses',
                    filter: `post_id=in.(${idList})`,
                },
                scheduleRefresh,
            );
        }

        channel.subscribe();

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            void supabase.removeChannel(channel);
        };
    }, [postIds, router, supabase, userId]);

    return null;
}
