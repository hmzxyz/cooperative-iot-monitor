type Thresholds = {
  warning: number;
  critical: number;
};

interface GaugeCardProps {
  label: string;
  value: number;
  unit: string;
  thresholds: Thresholds;
}

export function GaugeCard({ label, value, unit, thresholds }: GaugeCardProps) {
  // Determine the status string based on threshold values.
  const status =
    value >= thresholds.critical
      ? 'critical'
      : value >= thresholds.warning
      ? 'warning'
      : 'normal';

  // Choose a Tailwind CSS class based on the status.
  const statusClass =
    status === 'critical'
      ? 'bg-rose-500/15 text-rose-200 border-rose-500/25'
      : status === 'warning'
      ? 'bg-amber-500/15 text-amber-200 border-amber-500/25'
      : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20';

  return (
    <div className={`rounded-3xl border ${statusClass} p-6 shadow-sm`}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-400">{label}</span>
        <span className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-500">
          {status}
        </span>
      </div>
      <div className="mt-8 flex items-end gap-2">
        <span className="text-5xl font-semibold tracking-tight text-white">{value.toFixed(1)}</span>
        <span className="text-xl text-slate-400">{unit}</span>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Thresholds: warning {thresholds.warning}, critical {thresholds.critical}
      </p>
    </div>
  );
}
