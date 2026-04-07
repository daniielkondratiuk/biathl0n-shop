interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
}

export function KPICard({ label, value, delta, deltaLabel }: KPICardProps) {
  const isPositive = delta !== undefined && delta >= 0;
  const deltaColor = isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  const deltaIcon = isPositive ? "↑" : "↓";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-card-foreground">{value}</p>
        {delta !== undefined && (
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${deltaColor}`}>
              {deltaIcon} {Math.abs(delta).toFixed(1)}%
            </span>
            {deltaLabel && (
              <span className="text-xs text-muted-foreground">{deltaLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

