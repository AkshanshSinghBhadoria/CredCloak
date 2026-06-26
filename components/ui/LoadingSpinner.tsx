export function LoadingSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-4 w-4 rounded-full border-2 border-indigo-300/30 border-t-indigo-300 animate-spin" />
      <span>{label}</span>
    </span>
  );
}
