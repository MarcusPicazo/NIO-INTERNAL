import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  detail,
  icon
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="metal-panel rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-steel">{label}</p>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>
        {icon ? <div className="text-ion">{icon}</div> : null}
      </div>
      {detail ? <p className="mt-3 text-sm text-steel">{detail}</p> : null}
    </div>
  );
}
