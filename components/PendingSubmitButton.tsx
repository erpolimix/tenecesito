'use client';

import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

type PendingSubmitButtonProps = {
  children: React.ReactNode;
  className: string;
  pendingText?: string;
  disabled?: boolean;
};

export default function PendingSubmitButton({
  children,
  className,
  pendingText = 'Procesando...',
  disabled = false,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} cursor-pointer disabled:cursor-not-allowed ${pending ? 'opacity-80 cursor-wait' : ''}`}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
