// src/features/admin/orders/ui/components/order-metric-card.tsx
interface OrderMetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
}

export function OrderMetricCard({ label, value, trend }: OrderMetricCardProps) {
  return (
    <div className="group rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {trend && (
        <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
      )}
    </div>
  );
}

