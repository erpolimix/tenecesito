'use client';

import { useEffect, useState } from 'react';
import { isUrgentActive } from '@/lib/urgency';

function formatRemaining(urgentUntil: string, nowMs: number) {
    const remainingMs = new Date(urgentUntil).getTime() - nowMs;
    if (remainingMs <= 0) return null;

    const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}min`;
    }

    return `${totalMinutes} min`;
}

export default function UrgencyBadge({
    priorityLevel,
    urgentUntil,
    isClosed,
}: {
    priorityLevel?: string | null;
    urgentUntil?: string | null;
    isClosed?: boolean;
}) {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        if (!urgentUntil) return;

        const intervalId = window.setInterval(() => {
            setNowMs(Date.now());
        }, 60000);

        return () => window.clearInterval(intervalId);
    }, [urgentUntil]);

    if (!isUrgentActive({ priority_level: priorityLevel, urgent_until: urgentUntil, is_closed: isClosed }, nowMs)) {
        return null;
    }

    const remaining = urgentUntil ? formatRemaining(urgentUntil, nowMs) : null;

    return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Urgente</span>
            {remaining && <span className="font-semibold normal-case tracking-normal">{remaining}</span>}
        </span>
    );
}