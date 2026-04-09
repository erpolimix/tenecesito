type RouteLoadingProps = {
  message?: string;
};

export default function RouteLoading({ message = 'Cargando...' }: RouteLoadingProps) {
  return (
    <div className="w-full min-h-[40vh] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-11 h-11 rounded-full border-2 border-[var(--tn-outline)]/35 border-t-[var(--tn-primary)] animate-spin" />
      <p className="mt-4 text-sm font-semibold text-[var(--tn-muted)] tracking-wide">{message}</p>
    </div>
  );
}
