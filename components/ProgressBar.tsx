export function ProgressBar({
  current,
  min,
  max
}: {
  current: number;
  min: number | null;
  max: number | null;
}) {
  const safeMin = min || 0;
  const safeMax = max || Math.max(current, safeMin + 1);
  const total = Math.max(safeMax - safeMin, 1);
  const progress = Math.min(Math.max(((current - safeMin) / total) * 100, 0), 100);

  return (
    <div className="h-3 overflow-hidden rounded-full border border-ion/20 bg-black/40">
      <div
        className="h-full rounded-full bg-gradient-to-r from-ion via-emerald-300 to-ember"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
