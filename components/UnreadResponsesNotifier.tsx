'use client';

import { useEffect } from 'react';

export default function UnreadResponsesNotifier() {
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('tn:unread-responses-changed'));
    }, []);

    return null;
}
